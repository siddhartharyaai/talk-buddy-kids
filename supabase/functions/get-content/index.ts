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
    
    if (!type || !['story', 'rhyme'].includes(type)) {
      throw new Error('Invalid content type. Must be: story or rhyme');
    }

    console.log(`🔍 Fetching ${type} content: lang=${language}, age=${age}, topic=${topic}`);

    // Check cache first
    const cacheKey = `${type}-${language}-${age}-${topic}`;
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() < cached.expiry) {
      console.log('✅ Returning cached content');
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
        content = await getStoryContentWithFallback(language, age, topic);
        break;
      case 'rhyme':
        content = await getRhymeContentWithFallback(language, age, topic);
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
    console.error('❌ Error in get-content:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

// ============= NEW: Story content with dynamic fallback =============
async function getStoryContentWithFallback(language: string, age: number, topic: string) {
  try {
    // Step 1: Try to get from storage
    console.log(`📚 Step 1: Trying storage for story (${language}/${topic})`);
    const storageContent = await getStoryContent(language, age, topic);
    if (storageContent) {
      console.log('✅ Found story in storage');
      return { ...storageContent, source: 'storage' };
    }
  } catch (error) {
    console.log(`⚠️ Storage failed: ${error.message}`);
  }

  try {
    // Step 2: Try to import from StoryWeaver
    console.log(`🌐 Step 2: Trying StoryWeaver import for topic: ${topic}`);
    const importResult = await supabase.functions.invoke('import-storyweaver', {
      body: { 
        topic, 
        language,
        maxStories: 1 
      }
    });

    if (importResult.data && !importResult.error) {
      console.log('✅ Successfully imported from StoryWeaver');
      // Try storage again after import
      const newStorageContent = await getStoryContent(language, age, topic);
      if (newStorageContent) {
        return { ...newStorageContent, source: 'imported' };
      }
    }
  } catch (error) {
    console.log(`⚠️ Import failed: ${error.message}`);
  }

  // Step 3: Generate with Gemini as fallback
  console.log(`🤖 Step 3: Generating original story with Gemini`);
  const generatedContent = await generateStoryWithGemini(topic, age, language);
  
  // Store generated content for future use
  await storeGeneratedContent('story', topic, language, generatedContent);
  
  return { ...generatedContent, source: 'generated', isAiGenerated: true };
}

// ============= NEW: Rhyme content with dynamic fallback =============
async function getRhymeContentWithFallback(language: string, age: number, topic: string) {
  try {
    // Step 1: Try to get from storage
    console.log(`🎵 Step 1: Trying storage for rhyme (${language}/${topic})`);
    const storageContent = await getRhymeContent(language, age, topic);
    if (storageContent) {
      console.log('✅ Found rhyme in storage');
      return { ...storageContent, source: 'storage' };
    }
  } catch (error) {
    console.log(`⚠️ Storage failed: ${error.message}`);
  }

  try {
    // Step 2: Try to import from Wikimedia/other sources
    console.log(`🌐 Step 2: Trying rhyme import for topic: ${topic}`);
    const importResult = await supabase.functions.invoke('import-rhyme', {
      body: { 
        topic, 
        language,
        maxRhymes: 1 
      }
    });

    if (importResult.data && !importResult.error) {
      console.log('✅ Successfully imported rhyme');
      // Try storage again after import
      const newStorageContent = await getRhymeContent(language, age, topic);
      if (newStorageContent) {
        return { ...newStorageContent, source: 'imported' };
      }
    }
  } catch (error) {
    console.log(`⚠️ Rhyme import failed: ${error.message}`);
  }

  // Step 3: Generate with Gemini as fallback
  console.log(`🤖 Step 3: Generating original rhyme with Gemini`);
  const generatedContent = await generateRhymeWithGemini(topic, age, language);
  
  // Store generated content for future use
  await storeGeneratedContent('rhyme', topic, language, generatedContent);
  
  return { ...generatedContent, source: 'generated', isAiGenerated: true };
}

// ============= NEW: Gemini content generation =============
async function generateStoryWithGemini(topic: string, age: number, language: string) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `Write an original ${language === 'hi' ? 'Hindi' : 'English'} bedtime story for a ${age}-year-old child about ${topic}. 

Requirements:
- 250-300 words maximum
- Cheerful, positive tone
- Age-appropriate content
- Simple vocabulary for ${age}-year-olds
- Include a positive lesson or moral
- Structure: beginning, middle, end

Return ONLY a JSON object with this structure:
{
  "title": "Story Title",
  "body": "The complete story text...",
  "author": "AI Generated",
  "tags": ["${topic}", "bedtime", "children"],
  "ageband": "${determineAgeBand(age)}"
}`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 600,
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No content generated by Gemini');
    }

    // Parse the JSON response
    const jsonStart = generatedText.indexOf('{');
    const jsonEnd = generatedText.lastIndexOf('}') + 1;
    const jsonStr = generatedText.slice(jsonStart, jsonEnd);
    
    const storyData = JSON.parse(jsonStr);
    
    // Chunk into scenes
    const scenes = chunkStoryIntoScenes(storyData.body);
    
    return {
      ...storyData,
      scenes,
      id: `generated_${Date.now()}_${topic.replace(/\s+/g, '_')}`
    };

  } catch (error) {
    console.error('❌ Gemini story generation failed:', error);
    // Return a simple fallback story
    return createFallbackStory(topic, age);
  }
}

async function generateRhymeWithGemini(topic: string, age: number, language: string) {
  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `Write an original ${language === 'hi' ? 'Hindi' : 'English'} children's rhyme about ${topic} for a ${age}-year-old child.

Requirements:
- 8-12 rhyming lines
- Simple, repetitive words
- Fun, bouncy rhythm
- Easy to sing along
- Age-appropriate for ${age}-year-olds

Return ONLY a JSON object with this structure:
{
  "title": "Rhyme Title About ${topic}",
  "lyrics": "Line 1\nLine 2\nLine 3...",
  "tags": ["${topic}", "rhyme", "singing"]
}`;

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: 400,
          temperature: 0.8,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('No rhyme generated by Gemini');
    }

    // Parse the JSON response
    const jsonStart = generatedText.indexOf('{');
    const jsonEnd = generatedText.lastIndexOf('}') + 1;
    const jsonStr = generatedText.slice(jsonStart, jsonEnd);
    
    const rhymeData = JSON.parse(jsonStr);
    
    return {
      ...rhymeData,
      id: `generated_rhyme_${Date.now()}_${topic.replace(/\s+/g, '_')}`
    };

  } catch (error) {
    console.error('❌ Gemini rhyme generation failed:', error);
    // Return a simple fallback rhyme
    return createFallbackRhyme(topic);
  }
}

// ============= NEW: Store generated content =============
async function storeGeneratedContent(type: string, topic: string, language: string, content: any) {
  try {
    const fileName = `generated/${Date.now()}_${topic.replace(/\s+/g, '_')}.json`;
    const fullPath = `${language}/${type}s/${fileName}`;
    
    const { error } = await supabase.storage
      .from('content')
      .upload(fullPath, JSON.stringify(content, null, 2), {
        contentType: 'application/json',
        upsert: true
      });

    if (error) {
      console.error('⚠️ Failed to store generated content:', error);
    } else {
      console.log(`✅ Stored generated ${type} at: ${fullPath}`);
    }
  } catch (error) {
    console.error('⚠️ Error storing generated content:', error);
  }
}

// ============= Fallback content creators =============
function createFallbackStory(topic: string, age: number) {
  const scenes = [
    `Once upon a time, there was a friendly ${topic} who lived in a magical place.`,
    `Every day, the ${topic} would go on wonderful adventures and make new friends.`,
    `One day, something exciting happened that taught everyone an important lesson.`,
    `In the end, everyone was happy and learned that being kind is the most important thing. The end.`
  ];

  return {
    id: `fallback_story_${topic}_${Date.now()}`,
    title: `The Adventure of the Friendly ${topic}`,
    body: scenes.join(' '),
    scenes,
    author: 'Buddy AI',
    tags: [topic, 'adventure', 'friendship'],
    ageband: determineAgeBand(age)
  };
}

function createFallbackRhyme(topic: string) {
  const lyrics = `${topic}, ${topic}, come and play,
Dance and sing throughout the day.
Happy children love to see,
${topic} friends so wild and free!

${topic}, ${topic}, jump around,
Make a happy, joyful sound.
Clap your hands and stomp your feet,
${topic} friends are oh so sweet!`;

  return {
    id: `fallback_rhyme_${topic}_${Date.now()}`,
    title: `The ${topic} Song`,
    lyrics,
    tags: [topic, 'rhyme', 'dance']
  };
}

// ============= EXISTING: Original functions (unchanged) =============
async function getStoryContent(language: string, age: number, topic: string) {
  console.log(`📖 Fetching story content for ${language}, age ${age}, topic: ${topic}`);
  
  // Determine the age band for the child
  const ageband = determineAgeBand(age);
  console.log(`Child age ${age} maps to age band: ${ageband}`);

  // Try to list files in the stories folder
  let folderPath = `${language}/stories`;
  
  console.log(`📂 Listing files in: ${folderPath}`);
  const { data: files, error: listError } = await supabase.storage
    .from('content')
    .list(folderPath);

  if (listError) {
    console.log(`❌ Error listing ${language} stories:`, listError);
    
    // Fallback to English if the specified language fails
    if (language !== 'en') {
      console.log('🔄 Falling back to English stories');
      folderPath = 'en/stories';
      const { data: englishFiles, error: englishError } = await supabase.storage
        .from('content')
        .list(folderPath);
        
      if (englishError) {
        console.error('❌ Failed to list English stories too:', englishError);
        throw new Error(`No stories available for language ${language} or English fallback`);
      }
      
      if (!englishFiles || englishFiles.length === 0) {
        throw new Error('No English story files found');
      }
      
      return await processStoryFiles(englishFiles, folderPath, ageband, age, topic);
    } else {
      throw new Error(`Failed to list story files: ${listError.message}`);
    }
  }

  if (!files || files.length === 0) {
    throw new Error(`No story files found in ${folderPath}`);
  }

  console.log(`📚 Found ${files.length} story files`);
  
  return await processStoryFiles(files, folderPath, ageband, age, topic);
}

async function processStoryFiles(files: any[], folderPath: string, ageband: string, childAge: number, topic: string) {
  // Filter for JSON files only
  const jsonFiles = files.filter(file => file.name.endsWith('.json'));
  console.log(`📄 Processing ${jsonFiles.length} JSON files`);

  let suitableStories = [];

  // Download and check each story file
  for (const file of jsonFiles) {
    try {
      const filePath = `${folderPath}/${file.name}`;
      console.log(`📥 Downloading: ${filePath}`);
      
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('content')
        .download(filePath);
        
      if (downloadError) {
        console.log(`⚠️  Failed to download ${filePath}:`, downloadError);
        continue;
      }

      const fileContent = await fileData.text();
      const story = JSON.parse(fileContent);

      console.log(`📖 Checking story: "${story.title}" (age: ${story.ageband})`);

      // Check if story is suitable for child's age
      if (story.ageband && !isAgeAppropriate(story.ageband, childAge)) {
        console.log(`❌ Story "${story.title}" not suitable for age ${childAge} (requires ${story.ageband})`);
        continue;
      }

      // Check if story matches the topic
      const storyText = `${story.title} ${story.body} ${story.tags?.join(' ') || ''}`.toLowerCase();
      if (storyText.includes(topic.toLowerCase())) {
        console.log(`✅ Story "${story.title}" matches topic "${topic}"`);
        suitableStories.push(story);
      } else {
        console.log(`➖ Story "${story.title}" doesn't match topic "${topic}"`);
      }
    } catch (parseError) {
      console.log(`⚠️  Failed to parse ${file.name}:`, parseError);
      continue;
    }
  }

  if (suitableStories.length === 0) {
    // If no stories match the topic, return any age-appropriate story
    console.log(`🔄 No topic-specific stories found, looking for any age-appropriate story`);
    
    for (const file of jsonFiles) {
      try {
        const filePath = `${folderPath}/${file.name}`;
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('content')
          .download(filePath);
          
        if (downloadError) continue;

        const fileContent = await fileData.text();
        const story = JSON.parse(fileContent);

        if (!story.ageband || isAgeAppropriate(story.ageband, childAge)) {
          suitableStories.push(story);
          break; // Just get one suitable story
        }
      } catch (error) {
        continue;
      }
    }
  }

  if (suitableStories.length === 0) {
    throw new Error(`No suitable stories found for age ${childAge} and topic "${topic}"`);
  }

  // Pick a random suitable story
  const selectedStory = suitableStories[Math.floor(Math.random() * suitableStories.length)];
  console.log(`🎯 Selected story: "${selectedStory.title}"`);

  // Chunk the story into scenes
  const scenes = chunkStoryIntoScenes(selectedStory.body);
  
  return {
    ...selectedStory,
    scenes
  };
}

async function getRhymeContent(language: string, age: number, topic: string) {
  console.log(`🎵 Fetching rhyme content for ${language}, topic: ${topic}`);
  
  // Try to list files in the rhymes folder
  let folderPath = `${language}/rhymes`;
  
  console.log(`📂 Listing files in: ${folderPath}`);
  const { data: files, error: listError } = await supabase.storage
    .from('content')
    .list(folderPath);

  if (listError) {
    console.log(`❌ Error listing ${language} rhymes:`, listError);
    
    // Fallback to English if the specified language fails
    if (language !== 'en') {
      console.log('🔄 Falling back to English rhymes');
      folderPath = 'en/rhymes';
      const { data: englishFiles, error: englishError } = await supabase.storage
        .from('content')
        .list(folderPath);
        
      if (englishError) {
        console.error('❌ Failed to list English rhymes too:', englishError);
        throw new Error(`No rhymes available for language ${language} or English fallback`);
      }
      
      if (!englishFiles || englishFiles.length === 0) {
        throw new Error('No English rhyme files found');
      }
      
      files = englishFiles;
    } else {
      throw new Error(`Failed to list rhyme files: ${listError.message}`);
    }
  }

  if (!files || files.length === 0) {
    throw new Error(`No rhyme files found in ${folderPath}`);
  }

  console.log(`🎼 Found ${files.length} rhyme files`);
  
  // Filter for JSON files only
  const jsonFiles = files.filter(file => file.name.endsWith('.json'));

  // Prefer specific matches first
  let selectedFile = jsonFiles.find(file => 
    file.name.toLowerCase().includes(topic.toLowerCase()) ||
    file.name.toLowerCase().includes('twinkle') // Example: prefer twinkle for star topics
  );

  // If no specific match, pick a random rhyme
  if (!selectedFile && jsonFiles.length > 0) {
    selectedFile = jsonFiles[Math.floor(Math.random() * jsonFiles.length)];
  }

  if (!selectedFile) {
    throw new Error(`No suitable rhyme files found for topic "${topic}"`);
  }

  const filePath = `${folderPath}/${selectedFile.name}`;
  console.log(`📥 Downloading rhyme: ${filePath}`);
  
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('content')
    .download(filePath);
    
  if (downloadError) {
    console.error(`❌ Failed to download ${filePath}:`, downloadError);
    throw new Error(`Failed to download rhyme: ${downloadError.message}`);
  }

  const fileContent = await fileData.text();
  const rhyme = JSON.parse(fileContent);

  console.log(`🎯 Selected rhyme: "${rhyme.title}"`);
  
  return rhyme;
}

// ============= EXISTING: Utility functions (unchanged) =============
function determineAgeBand(age: number): string {
  if (age <= 3) return '0-3';
  if (age <= 5) return '3-5';
  if (age <= 8) return '5-8';
  if (age <= 12) return '8-12';
  return '12+';
}

function isAgeAppropriate(storyAgeBand: string, childAge: number): boolean {
  const [minAge, maxAge] = storyAgeBand.split('-').map(age => 
    age.includes('+') ? parseInt(age) : parseInt(age)
  );

  if (storyAgeBand.includes('+')) {
    return childAge >= minAge;
  }

  return childAge >= minAge && childAge <= (maxAge || minAge);
}

function chunkStoryIntoScenes(storyBody: string): string[] {
  // Split story into sentences
  const sentences = storyBody.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  const scenes = [];
  let currentScene = '';
  let wordCount = 0;
  const maxWordsPerScene = 40;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;
    
    if (wordCount + sentenceWords > maxWordsPerScene && currentScene.length > 0) {
      scenes.push(currentScene.trim() + '.');
      currentScene = sentence.trim();
      wordCount = sentenceWords;
    } else {
      currentScene += (currentScene.length > 0 ? '. ' : '') + sentence.trim();
      wordCount += sentenceWords;
    }
  }

  if (currentScene.length > 0) {
    scenes.push(currentScene.trim() + '.');
  }

  return scenes.filter(scene => scene.length > 0);
}
