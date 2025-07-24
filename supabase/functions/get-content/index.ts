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

// Simple in-memory cache (in production, use Redis or KV)
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, language = 'en', age = 6, topic = 'animals' } = await req.json();
    
    if (!type || !['story', 'rhyme', 'sfx'].includes(type)) {
      throw new Error('Invalid content type. Must be: story, rhyme, or sfx');
    }

    console.log(`Fetching ${type} content: lang=${language}, age=${age}, topic=${topic}`);

    // Check cache first
    const cacheKey = `${type}-${language}-${age}-${topic}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      console.log('Returning cached content');
      return new Response(
        JSON.stringify({ 
          content: cached.data,
          cached: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let content;

    switch (type) {
      case 'story':
        content = await getStoryContent(language, age, topic);
        break;
      case 'rhyme':
        content = await getRhymeContent(language, age, topic);
        break;
      case 'sfx':
        content = await getSfxContent(topic);
        break;
      default:
        throw new Error(`Unsupported content type: ${type}`);
    }

    // Cache the result
    cache.set(cacheKey, {
      data: content,
      expiry: Date.now() + CACHE_DURATION
    });

    return new Response(
      JSON.stringify({ 
        content,
        cached: false 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error fetching content:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function getStoryContent(language: string, age: number, topic: string) {
  const ageBand = determineAgeBand(age);
  const folderPath = `stories/${language}/`;
  
  try {
    // List files in the stories folder for the language
    const { data: files, error } = await supabase.storage
      .from('content')
      .list(folderPath);

    if (error || !files || files.length === 0) {
      console.log(`No stories found for ${language}, trying English fallback`);
      // Fallback to English if no stories in requested language
      if (language !== 'en') {
        return await getStoryContent('en', age, topic);
      }
      throw new Error('No stories available');
    }

    // Filter stories by age band and topic (basic matching)
    const suitableStories = [];
    
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        try {
          const { data } = await supabase.storage
            .from('content')
            .download(`${folderPath}${file.name}`);
          
          if (data) {
            const text = await data.text();
            const story = JSON.parse(text);
            
            // Check if story matches criteria
            if (story.ageBand === ageBand || isAgeAppropriate(story.ageBand, age)) {
              // Simple topic matching
              const storyText = (story.title + ' ' + story.body + ' ' + (story.tags?.join(' ') || '')).toLowerCase();
              if (storyText.includes(topic.toLowerCase()) || topic === 'any') {
                suitableStories.push(story);
              }
            }
          }
        } catch (err) {
          console.error(`Error reading story file ${file.name}:`, err);
        }
      }
    }

    if (suitableStories.length === 0) {
      throw new Error(`No suitable stories found for age ${age}, topic ${topic}`);
    }

    // Return a random suitable story
    const selectedStory = suitableStories[Math.floor(Math.random() * suitableStories.length)];
    
    return {
      type: 'story',
      ...selectedStory,
      scenes: chunkStoryIntoScenes(selectedStory.body)
    };

  } catch (error) {
    console.error('Error fetching story:', error);
    throw error;
  }
}

async function getRhymeContent(language: string, age: number, topic: string) {
  const folderPath = `rhymes/${language}/`;
  
  try {
    const { data: files, error } = await supabase.storage
      .from('content')
      .list(folderPath);

    if (error || !files || files.length === 0) {
      if (language !== 'en') {
        return await getRhymeContent('en', age, topic);
      }
      throw new Error('No rhymes available');
    }

    // For now, return a random rhyme file
    const rhymeFiles = files.filter(f => f.name.endsWith('.json'));
    if (rhymeFiles.length === 0) {
      throw new Error('No rhyme files found');
    }

    const randomFile = rhymeFiles[Math.floor(Math.random() * rhymeFiles.length)];
    const { data } = await supabase.storage
      .from('content')
      .download(`${folderPath}${randomFile.name}`);

    if (!data) {
      throw new Error('Failed to download rhyme file');
    }

    const text = await data.text();
    const rhyme = JSON.parse(text);
    
    return {
      type: 'rhyme',
      ...rhyme
    };

  } catch (error) {
    console.error('Error fetching rhyme:', error);
    throw error;
  }
}

async function getSfxContent(topic: string) {
  const folderPath = 'sfx/';
  
  console.log(`🔍 getSfxContent called with topic: "${topic}"`);
  
  try {
    console.log(`📁 Listing SFX files in folder: ${folderPath}`);
    const { data: files, error } = await supabase.storage
      .from('content')
      .list(folderPath);

    console.log(`📄 Found ${files?.length || 0} files:`, files?.map(f => f.name) || []);
    
    if (error || !files || files.length === 0) {
      throw new Error('No sound effects available');
    }

    // Filter by topic/name matching - look for JSON metadata files
    console.log(`🔍 Looking for JSON files matching topic: "${topic}"`);
    const matchingFiles = [];
    
    for (const file of files) {
      console.log(`📋 Checking file: ${file.name}`);
      if (file.name.endsWith('.json')) {
        try {
          const { data } = await supabase.storage
            .from('content')
            .download(`${folderPath}${file.name}`);
          
          if (data) {
            const text = await data.text();
            const sfxData = JSON.parse(text);
            console.log(`📋 SFX data loaded:`, sfxData);
            
            // Check if SFX matches topic
            const sfxText = (sfxData.name + ' ' + (sfxData.tags?.join(' ') || '') + ' ' + (sfxData.description || '')).toLowerCase();
            console.log(`🔍 Matching "${topic}" against: "${sfxText}"`);
            if (sfxText.includes(topic.toLowerCase()) || topic === 'any') {
              console.log(`✅ Match found! Adding SFX: ${sfxData.name}`);
              matchingFiles.push({
                ...sfxData,
                fileName: file.name
              });
            } else {
              console.log(`❌ No match for topic "${topic}" in "${sfxText}"`);
            }
          }
        } catch (err) {
          console.error(`Error reading SFX file ${file.name}:`, err);
        }
      } else {
        console.log(`⏭️ Skipping non-JSON file: ${file.name}`);
      }

    }

    console.log(`📊 Found ${matchingFiles.length} matching SFX files`);
    if (matchingFiles.length === 0) {
      throw new Error(`No sound effects found for topic: ${topic}`);
    }

    const selectedSfx = matchingFiles[Math.floor(Math.random() * matchingFiles.length)];
    
    return {
      type: 'sfx',
      ...selectedSfx
    };

  } catch (error) {
    console.error('Error fetching SFX:', error);
    throw error;
  }
}

function determineAgeBand(age: number): string {
  if (age <= 5) return '3-5';
  if (age <= 7) return '5-7';
  if (age <= 9) return '7-9';
  if (age <= 12) return '9-12';
  return '12+';
}

function isAgeAppropriate(storyAgeBand: string, childAge: number): boolean {
  const ranges = {
    '3-5': [3, 5],
    '5-7': [5, 7],
    '7-9': [7, 9],
    '9-12': [9, 12],
    '12+': [12, 18]
  };
  
  const range = ranges[storyAgeBand as keyof typeof ranges];
  if (!range) return true;
  
  return childAge >= range[0] && childAge <= range[1];
}

function chunkStoryIntoScenes(storyBody: string): string[] {
  // Split story into scenes of approximately 250 words
  const words = storyBody.split(' ');
  const scenes = [];
  let currentScene = [];
  
  for (const word of words) {
    currentScene.push(word);
    
    // Check for natural break points
    if (currentScene.length >= 200 && (
      word.endsWith('.') || 
      word.endsWith('!') || 
      word.endsWith('?') ||
      word.endsWith('।') // Hindi period
    )) {
      scenes.push(currentScene.join(' '));
      currentScene = [];
    }
  }
  
  // Add remaining words as final scene
  if (currentScene.length > 0) {
    scenes.push(currentScene.join(' '));
  }
  
  return scenes;
}