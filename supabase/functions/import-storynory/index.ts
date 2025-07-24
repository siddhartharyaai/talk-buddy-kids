import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// Storynory RSS feeds by category
const storynoryFeeds = {
  'fairy-tales': 'https://www.storynory.com/category/fairy-tales/feed/',
  'original-stories': 'https://www.storynory.com/category/original-stories/feed/',
  'myths-legends': 'https://www.storynory.com/category/myths-legends/feed/',
  'educational': 'https://www.storynory.com/category/educational/feed/',
  'poems': 'https://www.storynory.com/category/poems/feed/',
  'all': 'https://www.storynory.com/feed/'
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category = 'fairy-tales', maxItems = 10, operation = 'fetch' } = await req.json();

    console.log(`Storynory operation: ${operation} for category: ${category}`);

    if (operation === 'list-categories') {
      return new Response(
        JSON.stringify({
          success: true,
          categories: Object.keys(storynoryFeeds),
          feeds: storynoryFeeds
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const feedUrl = storynoryFeeds[category as keyof typeof storynoryFeeds];
    if (!feedUrl) {
      throw new Error(`Unknown category: ${category}. Available: ${Object.keys(storynoryFeeds).join(', ')}`);
    }

    console.log(`Fetching Storynory RSS: ${feedUrl}`);

    // Fetch RSS feed
    const rssResponse = await fetch(feedUrl);
    if (!rssResponse.ok) {
      throw new Error(`Failed to fetch RSS feed: ${rssResponse.statusText}`);
    }

    const rssText = await rssResponse.text();
    console.log(`RSS feed length: ${rssText.length} characters`);

    // Parse RSS feed (simple XML parsing for this use case)
    const stories = await parseStorynoryRSS(rssText, maxItems);
    console.log(`Parsed ${stories.length} stories from RSS`);

    if (operation === 'fetch' || operation === 'cache') {
      // Store stories metadata for quick access
      const storynoryData = {
        category: category,
        updatedAt: new Date().toISOString(),
        feedUrl: feedUrl,
        stories: stories,
        totalStories: stories.length,
        license: 'CC-BY-NC (for streaming only)',
        source: 'storynory'
      };

      const fileName = `storynory/${category}_index.json`;
      const indexBlob = new Blob([JSON.stringify(storynoryData, null, 2)], { type: 'application/json' });

      const { error } = await supabase.storage
        .from('content')
        .upload(fileName, indexBlob, {
          cacheControl: '1800', // 30 minutes cache
          upsert: true
        });

      if (error) {
        console.error('Failed to cache Storynory index:', error);
        // Continue without caching
      } else {
        console.log(`Cached Storynory index: ${fileName}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        category: category,
        operation: operation,
        stories: stories.map(story => ({
          title: story.title,
          description: story.description?.substring(0, 200) + '...',
          audioUrl: story.audioUrl,
          duration: story.duration,
          publishDate: story.publishDate,
          ageGroup: story.ageGroup,
          streamingOnly: true // Note: Storynory is for streaming, not download
        })),
        totalStories: stories.length,
        note: 'Storynory content is CC-BY-NC licensed for streaming only. Do not cache audio files.',
        streamingInfo: {
          license: 'Creative Commons BY-NC',
          usage: 'Stream at runtime only',
          commercial: false
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error with Storynory:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function parseStorynoryRSS(rssText: string, maxItems: number) {
  const stories = [];
  
  // Simple regex-based RSS parsing (for production, consider using a proper XML parser)
  const itemRegex = /<item>(.*?)<\/item>/gs;
  const titleRegex = /<title><!\[CDATA\[(.*?)\]\]><\/title>/;
  const descRegex = /<description><!\[CDATA\[(.*?)\]\]><\/description>/;
  const linkRegex = /<link>(.*?)<\/link>/;
  const pubDateRegex = /<pubDate>(.*?)<\/pubDate>/;
  const enclosureRegex = /<enclosure[^>]*url="([^"]*)"[^>]*type="audio\/[^"]*"[^>]*\/>/;

  let match;
  let count = 0;
  
  while ((match = itemRegex.exec(rssText)) !== null && count < maxItems) {
    const itemContent = match[1];
    
    const titleMatch = titleRegex.exec(itemContent);
    const descMatch = descRegex.exec(itemContent);
    const linkMatch = linkRegex.exec(itemContent);
    const dateMatch = pubDateRegex.exec(itemContent);
    const audioMatch = enclosureRegex.exec(itemContent);
    
    if (titleMatch && audioMatch) {
      const title = titleMatch[1].trim();
      const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || '';
      const audioUrl = audioMatch[1];
      const webUrl = linkMatch?.[1] || '';
      const publishDate = dateMatch?.[1] || '';
      
      // Determine appropriate age group based on title/description keywords
      const content = (title + ' ' + description).toLowerCase();
      let ageGroup = '5-12'; // Default
      
      if (content.includes('baby') || content.includes('toddler')) {
        ageGroup = '0-3';
      } else if (content.includes('fairy') || content.includes('simple')) {
        ageGroup = '3-7';
      } else if (content.includes('advanced') || content.includes('teen')) {
        ageGroup = '12+';
      }

      stories.push({
        title: title,
        description: description,
        audioUrl: audioUrl,
        webUrl: webUrl,
        publishDate: publishDate,
        ageGroup: ageGroup,
        duration: null, // Would need to fetch audio file head to get duration
        source: 'storynory',
        license: 'CC-BY-NC',
        streamingOnly: true
      });
      
      count++;
    }
  }
  
  return stories;
}