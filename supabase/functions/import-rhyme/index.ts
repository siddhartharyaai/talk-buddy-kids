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

// Wikimedia Commons nursery rhyme audio files (public domain)
const wikimediaRhymes: Record<string, any> = {
  en: {
    'twinkle-twinkle-little-star': {
      title: 'Twinkle Twinkle Little Star',
      wikimediaFile: 'File:Twinkle_Twinkle_Little_Star.ogg',
      lyrics: [
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!',
        'Up above the world so high,',
        'Like a diamond in the sky.',
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!'
      ],
      ageBand: '3-5',
      tags: ['stars', 'space', 'classic']
    },
    'mary-had-a-little-lamb': {
      title: 'Mary Had a Little Lamb',
      wikimediaFile: 'File:Mary_Had_a_Little_Lamb.ogg',
      lyrics: [
        'Mary had a little lamb,',
        'Its fleece was white as snow,',
        'And everywhere that Mary went,',
        'The lamb was sure to go.'
      ],
      ageBand: '3-5',
      tags: ['animals', 'school', 'classic']
    },
    'old-macdonald': {
      title: 'Old MacDonald Had a Farm',
      wikimediaFile: 'File:Old_MacDonald_Had_a_Farm.ogg',
      lyrics: [
        'Old MacDonald had a farm,',
        'E-I-E-I-O!',
        'And on his farm he had a cow,',
        'E-I-E-I-O!'
      ],
      ageBand: '3-5',
      tags: ['farm', 'animals', 'classic']
    },
    'baa-baa-black-sheep': {
      title: 'Baa Baa Black Sheep',
      wikimediaFile: 'File:Baa_Baa_Black_Sheep.ogg',
      lyrics: [
        'Baa, baa, black sheep,',
        'Have you any wool?',
        'Yes, sir, yes, sir,',
        'Three bags full.'
      ],
      ageBand: '3-5',
      tags: ['animals', 'wool', 'classic']
    }
  },
  hi: {
    'chanda-mama': {
      title: 'चंदा मामा',
      wikimediaFile: 'File:Chanda_Mama_Door_Ke.ogg',
      lyrics: [
        'चंदा मामा दूर के,',
        'पुए पकाए बूर के।',
        'आप खाएं थाली में,',
        'मुन्ने को दे प्याली में।'
      ],
      ageBand: '3-5',
      tags: ['moon', 'food', 'classic']
    },
    'nani-teri-morni': {
      title: 'नानी तेरी मोरनी',
      wikimediaFile: 'File:Nani_Teri_Morni.ogg',
      lyrics: [
        'नानी तेरी मोरनी को मोर ले गए,',
        'मोर ले गए, मोर ले गए,',
        'नानी तेरी मोरनी को मोर ले गए।'
      ],
      ageBand: '3-5',
      tags: ['birds', 'family', 'classic']
    }
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, language = 'en', customLyrics, wikimediaFile } = await req.json();
    
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
      const langRhymes = wikimediaRhymes[language] || wikimediaRhymes.en;
      
      let rhyme;
      if (wikimediaFile) {
        // Direct wikimedia file specified
        rhyme = { title, wikimediaFile, lyrics: [], ageBand: '3-5', tags: ['classic'] };
      } else {
        rhyme = langRhymes[slug];
        if (!rhyme) {
          // Try to find by partial title match
          const found = Object.entries(langRhymes).find(([key, data]: [string, any]) => 
            data.title.toLowerCase().includes(title.toLowerCase()) || 
            title.toLowerCase().includes(data.title.toLowerCase())
          );
          if (found) {
            rhyme = found[1];
          }
        }
      }

      if (!rhyme) {
        throw new Error(`Rhyme "${title}" not found in ${language} collection. Available: ${Object.values(langRhymes).map((r: any) => r.title).join(', ')}`);
      }

      rhymeData = {
        id: `wd_${slug}_${language}`,
        language: language,
        source: 'wikimedia',
        copyright: 'Public Domain',
        createdAt: new Date().toISOString(),
        ...rhyme
      };
    }

    // Download audio from Wikimedia Commons if available
    let audioFileName = null;
    if (rhymeData.wikimediaFile) {
      try {
        console.log(`Downloading audio from Wikimedia: ${rhymeData.wikimediaFile}`);
        
        // Get file info from Wikimedia API
        const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(rhymeData.wikimediaFile)}&prop=imageinfo&iiprop=url&format=json&origin=*`;
        const infoResponse = await fetch(infoUrl);
        const infoData = await infoResponse.json();
        
        const pages = infoData.query?.pages;
        const page = pages ? Object.values(pages)[0] as any : null;
        const audioUrl = page?.imageinfo?.[0]?.url;
        
        if (audioUrl) {
          console.log(`Found audio URL: ${audioUrl}`);
          
          // Download the audio file
          const audioResponse = await fetch(audioUrl);
          if (audioResponse.ok) {
            const audioBlob = await audioResponse.blob();
            const extension = audioUrl.split('.').pop()?.toLowerCase() || 'ogg';
            
            // Upload audio to storage
            audioFileName = `rhymes/${language}/${rhymeData.id}.${extension}`;
            const { error: audioError } = await supabase.storage
              .from('content')
              .upload(audioFileName, audioBlob, {
                cacheControl: '3600',
                upsert: true,
                contentType: audioBlob.type || 'audio/ogg'
              });
              
            if (audioError) {
              console.error('Audio upload error:', audioError);
              audioFileName = null; // Continue without audio
            } else {
              console.log(`Audio uploaded: ${audioFileName}`);
              rhymeData.audioFile = audioFileName;
            }
          }
        } else {
          console.warn(`No audio URL found for ${rhymeData.wikimediaFile}`);
        }
      } catch (error) {
        console.error(`Failed to download audio for ${rhymeData.wikimediaFile}:`, error);
        // Continue without audio
      }
    }

    // Store lyrics as text file
    const lyricsFileName = `rhymes/${language}/${rhymeData.id}.lyrics.txt`;
    const lyricsBlob = new Blob([rhymeData.lyrics.join('\n')], { type: 'text/plain' });
    
    const { error: lyricsError } = await supabase.storage
      .from('content')
      .upload(lyricsFileName, lyricsBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (lyricsError) {
      console.error('Lyrics upload error:', lyricsError);
    } else {
      rhymeData.lyricsFile = lyricsFileName;
    }

    // Store rhyme metadata as JSON
    const metadataFileName = `rhymes/${language}/${rhymeData.id}.json`;
    const metadataBlob = new Blob([JSON.stringify(rhymeData, null, 2)], { type: 'application/json' });

    const { error: metadataError } = await supabase.storage
      .from('content')
      .upload(metadataFileName, metadataBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (metadataError) {
      console.error('Metadata upload error:', metadataError);
      throw new Error(`Failed to store rhyme metadata: ${metadataError.message}`);
    }

    console.log(`Successfully imported rhyme: ${rhymeData.title} (${language})`);

    return new Response(
      JSON.stringify({
        success: true,
        rhyme: {
          id: rhymeData.id,
          title: rhymeData.title,
          language: rhymeData.language,
          metadataFile: metadataFileName,
          lyricsFile: rhymeData.lyricsFile,
          audioFile: rhymeData.audioFile,
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