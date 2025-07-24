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

// Common public domain nursery rhymes
const publicDomainRhymes: Record<string, any> = {
  en: {
    'twinkle-twinkle-little-star': {
      title: 'Twinkle Twinkle Little Star',
      lyrics: [
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!',
        'Up above the world so high,',
        'Like a diamond in the sky.',
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!'
      ],
      ageBand: '3-5',
      tags: ['stars', 'space', 'classic'],
      copyright: 'Public Domain'
    },
    'mary-had-a-little-lamb': {
      title: 'Mary Had a Little Lamb',
      lyrics: [
        'Mary had a little lamb,',
        'Its fleece was white as snow,',
        'And everywhere that Mary went,',
        'The lamb was sure to go.',
        'It followed her to school one day,',
        'Which was against the rule,',
        'It made the children laugh and play,',
        'To see a lamb at school.'
      ],
      ageBand: '3-5',
      tags: ['animals', 'school', 'classic'],
      copyright: 'Public Domain'
    },
    'old-macdonald': {
      title: 'Old MacDonald Had a Farm',
      lyrics: [
        'Old MacDonald had a farm,',
        'E-I-E-I-O!',
        'And on his farm he had a cow,',
        'E-I-E-I-O!',
        'With a moo moo here,',
        'And a moo moo there,',
        'Here a moo, there a moo,',
        'Everywhere a moo moo,',
        'Old MacDonald had a farm,',
        'E-I-E-I-O!'
      ],
      ageBand: '3-5',
      tags: ['farm', 'animals', 'classic'],
      copyright: 'Public Domain'
    }
  },
  hi: {
    'chanda-mama': {
      title: 'चंदा मामा',
      lyrics: [
        'चंदा मामा दूर के,',
        'पुए पकाए बूर के।',
        'आप खाएं थाली में,',
        'मुन्ने को दे प्याली में।',
        'प्याली गई टूट,',
        'मुन्ना गया रूठ।'
      ],
      ageBand: '3-5',
      tags: ['moon', 'food', 'classic'],
      copyright: 'Traditional/Public Domain'
    },
    'nani-teri-morni': {
      title: 'नानी तेरी मोरनी',
      lyrics: [
        'नानी तेरी मोरनी को मोर ले गए,',
        'मोर ले गए, मोर ले गए,',
        'नानी तेरी मोरनी को मोर ले गए।',
        'अब तो दे दे मोरनी,',
        'वर्ना मैं रो दूंगी।'
      ],
      ageBand: '3-5',
      tags: ['birds', 'family', 'classic'],
      copyright: 'Traditional/Public Domain'
    },
    'machli-jal-ki-rani': {
      title: 'मछली जल की रानी है',
      lyrics: [
        'मछली जल की रानी है,',
        'जीवन उसका पानी है।',
        'हाथ लगाओ डर जाएगी,',
        'बाहर निकालो मर जाएगी।'
      ],
      ageBand: '3-5',
      tags: ['fish', 'water', 'nature'],
      copyright: 'Traditional/Public Domain'
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, language = 'en', customLyrics } = await req.json();
    
    if (!title && !customLyrics) {
      throw new Error('Either title or customLyrics is required');
    }

    console.log(`Importing nursery rhyme: ${title} (${language})`);

    let rhymeData;

    if (customLyrics) {
      // Custom rhyme provided
      rhymeData = {
        id: `custom_${sanitizeFileName(title)}_${language}`,
        title: title,
        language: language,
        lyrics: Array.isArray(customLyrics) ? customLyrics : customLyrics.split('\n'),
        ageBand: '3-7',
        tags: ['custom', 'nursery'],
        copyright: 'Custom/User Provided',
        source: 'user-input',
        createdAt: new Date().toISOString()
      };
    } else {
      // Look up predefined rhyme
      const slug = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, '-');
      const langRhymes = publicDomainRhymes[language] || publicDomainRhymes.en;
      const rhyme = langRhymes[slug];

      if (!rhyme) {
        // Try to find by partial title match
        const found = Object.entries(langRhymes).find(([key, data]: [string, any]) => 
          data.title.toLowerCase().includes(title.toLowerCase()) || 
          title.toLowerCase().includes(data.title.toLowerCase())
        );

        if (!found) {
          throw new Error(`Rhyme "${title}" not found in ${language} collection. Available: ${Object.values(langRhymes).map((r: any) => r.title).join(', ')}`);
        }

        rhymeData = {
          id: `pd_${found[0]}_${language}`,
          language: language,
          source: 'public-domain',
          createdAt: new Date().toISOString(),
          ...found[1]
        };
      } else {
        rhymeData = {
          id: `pd_${slug}_${language}`,
          language: language,
          source: 'public-domain',
          createdAt: new Date().toISOString(),
          ...rhyme
        };
      }
    }

    // Store rhyme in Supabase Storage
    const fileName = `rhymes/${language}/${rhymeData.id}.json`;
    const rhymeBlob = new Blob([JSON.stringify(rhymeData, null, 2)], { type: 'application/json' });

    const { error } = await supabase.storage
      .from('content')
      .upload(fileName, rhymeBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('Storage error:', error);
      throw new Error(`Failed to store rhyme: ${error.message}`);
    }

    console.log(`Successfully imported rhyme: ${rhymeData.title} (${language})`);

    return new Response(
      JSON.stringify({
        success: true,
        rhyme: {
          id: rhymeData.id,
          title: rhymeData.title,
          language: rhymeData.language,
          fileName: fileName,
          lyricsCount: rhymeData.lyrics.length,
          ageBand: rhymeData.ageBand
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error importing rhyme:', error);
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

function sanitizeFileName(fileName: string): string {
  return fileName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}