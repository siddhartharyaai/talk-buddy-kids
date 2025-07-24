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

// Predefined content for bulk import
const contentLibrary = {
  stories: {
    // StoryWeaver book IDs (CC-BY-4.0)
    hi: [31095, 31328, 29415, 22751, 25755, 28965, 28675, 29642, 22316, 22563],
    en: [31096, 31329, 29416, 22752, 25756, 28966, 28676, 29643, 22317, 22564]
  },
  sfx: {
    // Freesound IDs for animal sounds (CC licensed)
    animals: [
      { id: 456518, name: 'Tiger Roar' },
      { id: 186942, name: 'Elephant Trumpet' },
      { id: 193528, name: 'Bird Chirp' },
      { id: 397622, name: 'Lion Roar' },
      { id: 316847, name: 'Dog Bark' },
      { id: 76722, name: 'Cat Meow' },
      { id: 372862, name: 'Cow Moo' },
      { id: 458662, name: 'Horse Neigh' },
      { id: 413185, name: 'Pig Oink' },
      { id: 415209, name: 'Duck Quack' }
    ]
  },
  rhymes: {
    en: ['Twinkle Twinkle Little Star', 'Mary Had a Little Lamb', 'Old MacDonald Had a Farm'],
    hi: ['चंदा मामा', 'नानी तेरी मोरनी', 'मछली जल की रानी है']
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      contentTypes = ['stories', 'sfx', 'rhymes'], 
      languages = ['en', 'hi'],
      maxItems = 10,
      dryRun = false 
    } = await req.json();

    console.log(`Starting bulk import: ${contentTypes.join(', ')} for languages: ${languages.join(', ')}`);
    
    const results = {
      stories: [],
      sfx: [],
      rhymes: [],
      errors: []
    };

    // Import Stories
    if (contentTypes.includes('stories')) {
      console.log('🚀 Importing stories...');
      for (const lang of languages) {
        const storyIds = contentLibrary.stories[lang as keyof typeof contentLibrary.stories] || [];
        const limitedIds = storyIds.slice(0, Math.min(maxItems, storyIds.length));
        
        for (const storyId of limitedIds) {
          try {
            if (dryRun) {
              results.stories.push({ id: storyId, language: lang, status: 'dry-run' });
            } else {
              console.log(`Importing story ${storyId} (${lang})`);
              const { data, error } = await supabase.functions.invoke('import-storyweaver', {
                body: { storyId }
              });
              
              if (error) throw error;
              results.stories.push({ id: storyId, language: lang, status: 'success', data });
            }
          } catch (error) {
            console.error(`Failed to import story ${storyId}:`, error);
            results.errors.push({ type: 'story', id: storyId, error: error.message });
          }
        }
      }
    }

    // Import Sound Effects
    if (contentTypes.includes('sfx')) {
      console.log('🔊 Importing sound effects...');
      const sfxList = contentLibrary.sfx.animals.slice(0, maxItems);
      
      for (const sfx of sfxList) {
        try {
          if (dryRun) {
            results.sfx.push({ id: sfx.id, name: sfx.name, status: 'dry-run' });
          } else {
            console.log(`Importing SFX ${sfx.id}: ${sfx.name}`);
            const { data, error } = await supabase.functions.invoke('import-sfx', {
              body: { freesoundId: sfx.id, name: sfx.name }
            });
            
            if (error) throw error;
            results.sfx.push({ id: sfx.id, name: sfx.name, status: 'success', data });
          }
        } catch (error) {
          console.error(`Failed to import SFX ${sfx.id}:`, error);
          results.errors.push({ type: 'sfx', id: sfx.id, error: error.message });
        }
      }
    }

    // Import Nursery Rhymes
    if (contentTypes.includes('rhymes')) {
      console.log('🎵 Importing nursery rhymes...');
      for (const lang of languages) {
        const rhymes = contentLibrary.rhymes[lang as keyof typeof contentLibrary.rhymes] || [];
        const limitedRhymes = rhymes.slice(0, maxItems);
        
        for (const rhymeTitle of limitedRhymes) {
          try {
            if (dryRun) {
              results.rhymes.push({ title: rhymeTitle, language: lang, status: 'dry-run' });
            } else {
              console.log(`Importing rhyme: ${rhymeTitle} (${lang})`);
              const { data, error } = await supabase.functions.invoke('import-rhyme', {
                body: { title: rhymeTitle, language: lang }
              });
              
              if (error) throw error;
              results.rhymes.push({ title: rhymeTitle, language: lang, status: 'success', data });
            }
          } catch (error) {
            console.error(`Failed to import rhyme ${rhymeTitle}:`, error);
            results.errors.push({ type: 'rhyme', title: rhymeTitle, error: error.message });
          }
        }
      }
    }

    const summary = {
      totalImported: results.stories.length + results.sfx.length + results.rhymes.length,
      stories: results.stories.length,
      sfx: results.sfx.length,
      rhymes: results.rhymes.length,
      errors: results.errors.length,
      dryRun
    };

    console.log('📊 Bulk import completed:', summary);

    return new Response(
      JSON.stringify({
        success: true,
        summary,
        results,
        message: dryRun ? 'Dry run completed - no files were actually imported' : 'Bulk import completed successfully'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Bulk import error:', error);
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