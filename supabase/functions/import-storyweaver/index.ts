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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { storyId } = await req.json();
    
    if (!storyId) {
      throw new Error('Story ID is required');
    }

    console.log(`Importing StoryWeaver story: ${storyId}`);

    // Fetch story from StoryWeaver API
    const storyResponse = await fetch(`https://storyweaver.org.in/api/v1/stories/${storyId}`);
    
    if (!storyResponse.ok) {
      throw new Error(`Failed to fetch story: ${storyResponse.statusText}`);
    }

    const storyData = await storyResponse.json();
    console.log('Fetched story data:', storyData.title);

    // Extract and clean the story content
    const story = {
      id: storyData.id,
      title: storyData.title,
      language: storyData.language,
      ageBand: determineAgeBand(storyData.reading_level || 1),
      body: cleanHtmlContent(storyData.description || ''),
      author: storyData.authors?.[0]?.name || 'Unknown',
      illustrator: storyData.illustrators?.[0]?.name || 'Unknown',
      tags: storyData.tags || [],
      readingLevel: storyData.reading_level || 1,
      pageCount: storyData.pages?.length || 0,
      createdAt: new Date().toISOString(),
      source: 'storyweaver',
      sourceUrl: `https://storyweaver.org.in/stories/${storyId}`
    };

    // If story has pages, extract the full content
    if (storyData.pages && storyData.pages.length > 0) {
      const pageContents = storyData.pages.map((page: any) => 
        cleanHtmlContent(page.content || '')
      ).filter((content: string) => content.trim().length > 0);
      
      story.body = pageContents.join('\n\n');
    }

    // Store story in Supabase Storage
    const fileName = `stories/${story.language}/${story.id}-${sanitizeFileName(story.title)}.json`;
    const storyBlob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });

    const { data, error } = await supabase.storage
      .from('content')
      .upload(fileName, storyBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Storage error:', error);
      throw new Error(`Failed to store story: ${error.message}`);
    }

    console.log(`Successfully imported story: ${story.title} (${story.language})`);

    return new Response(
      JSON.stringify({
        success: true,
        story: {
          id: story.id,
          title: story.title,
          language: story.language,
          ageBand: story.ageBand,
          fileName: fileName,
          pageCount: story.pageCount
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error importing story:', error);
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

function determineAgeBand(readingLevel: number): string {
  if (readingLevel <= 1) return '3-5';
  if (readingLevel <= 2) return '5-7';
  if (readingLevel <= 3) return '7-9';
  if (readingLevel <= 4) return '9-12';
  return '12+';
}

function cleanHtmlContent(html: string): string {
  // Remove HTML tags and decode entities
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}