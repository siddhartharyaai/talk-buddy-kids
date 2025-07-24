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
    const { librivoxId, title, maxChapters = 5 } = await req.json();
    
    if (!librivoxId) {
      throw new Error('LibriVox book ID is required');
    }

    console.log(`Importing LibriVox audiobook: ${librivoxId}`);

    // Get book info from LibriVox API
    const bookInfoUrl = `https://librivox.org/api/feed/audiobooks?id=${librivoxId}&format=json`;
    const bookResponse = await fetch(bookInfoUrl);
    
    if (!bookResponse.ok) {
      throw new Error(`Failed to fetch book info: ${bookResponse.statusText}`);
    }

    const bookData = await bookResponse.json();
    const book = bookData.books?.[0];
    
    if (!book) {
      throw new Error(`Book with ID ${librivoxId} not found`);
    }

    console.log(`Found book: ${book.title} by ${book.authors?.[0]?.first_name} ${book.authors?.[0]?.last_name}`);

    // Check if book is appropriate for children (basic filtering)
    const inappropriateKeywords = ['adult', 'mature', 'horror', 'war', 'violence'];
    const description = (book.description || '').toLowerCase();
    const bookTitle = book.title.toLowerCase();
    
    const hasInappropriatContent = inappropriateKeywords.some(keyword => 
      description.includes(keyword) || bookTitle.includes(keyword)
    );

    if (hasInappropriatContent) {
      console.warn(`Warning: Book "${book.title}" may contain inappropriate content for children`);
    }

    // Create audiobook metadata
    const audiobookData = {
      id: `librivox_${librivoxId}`,
      title: book.title,
      authors: book.authors || [],
      description: book.description || '',
      language: book.language || 'en',
      genres: book.genres || [],
      copyright: 'Public Domain',
      source: 'librivox',
      librivoxId: librivoxId,
      url: book.url_librivox,
      totalTime: book.totaltimesecs || 0,
      createdAt: new Date().toISOString(),
      chapters: []
    };

    // Get sections (chapters) for the book
    const sectionsUrl = `https://librivox.org/api/feed/audiobooks/sections?book_id=${librivoxId}&format=json`;
    const sectionsResponse = await fetch(sectionsUrl);
    
    if (sectionsResponse.ok) {
      const sectionsData = await sectionsResponse.json();
      const sections = sectionsData.sections || [];
      
      console.log(`Found ${sections.length} chapters, importing first ${maxChapters}`);
      
      // Process first few chapters
      const chaptersToProcess = sections.slice(0, maxChapters);
      
      for (const section of chaptersToProcess) {
        try {
          console.log(`Downloading chapter: ${section.title}`);
          
          // Download chapter audio
          const audioUrl = section.listen_url;
          if (!audioUrl) {
            console.warn(`No audio URL for chapter: ${section.title}`);
            continue;
          }

          const audioResponse = await fetch(audioUrl);
          if (!audioResponse.ok) {
            console.error(`Failed to download chapter ${section.section_number}: ${audioResponse.statusText}`);
            continue;
          }

          const audioBlob = await audioResponse.blob();
          const extension = audioUrl.split('.').pop()?.toLowerCase() || 'mp3';
          
          // Upload chapter to storage
          const chapterFileName = `audiobooks/${audiobookData.id}/chapter_${section.section_number}.${extension}`;
          const { error: chapterError } = await supabase.storage
            .from('content')
            .upload(chapterFileName, audioBlob, {
              cacheControl: '3600',
              upsert: true,
              contentType: audioBlob.type || 'audio/mpeg'
            });

          if (chapterError) {
            console.error(`Failed to upload chapter ${section.section_number}:`, chapterError);
            continue;
          }

          // Add chapter metadata
          const chapterData = {
            number: section.section_number,
            title: section.title || `Chapter ${section.section_number}`,
            fileName: chapterFileName,
            duration: section.playtime || 0,
            reader: section.readers?.[0]?.display_name || 'Unknown',
            downloadUrl: audioUrl
          };

          audiobookData.chapters.push(chapterData);
          console.log(`Successfully uploaded chapter ${section.section_number}: ${chapterData.title}`);

        } catch (error) {
          console.error(`Error processing chapter ${section.section_number}:`, error);
        }
      }
    }

    // Store audiobook metadata
    const metadataFileName = `audiobooks/${audiobookData.id}/metadata.json`;
    const metadataBlob = new Blob([JSON.stringify(audiobookData, null, 2)], { type: 'application/json' });

    const { error: metadataError } = await supabase.storage
      .from('content')
      .upload(metadataFileName, metadataBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (metadataError) {
      console.error('Metadata upload error:', metadataError);
      throw new Error(`Failed to store audiobook metadata: ${metadataError.message}`);
    }

    console.log(`Successfully imported audiobook: ${audiobookData.title} (${audiobookData.chapters.length} chapters)`);

    return new Response(
      JSON.stringify({
        success: true,
        audiobook: {
          id: audiobookData.id,
          title: audiobookData.title,
          authors: audiobookData.authors.map((a: any) => `${a.first_name} ${a.last_name}`),
          language: audiobookData.language,
          chaptersImported: audiobookData.chapters.length,
          totalDuration: audiobookData.totalTime,
          metadataFile: metadataFileName,
          warning: hasInappropriatContent ? 'May contain content inappropriate for young children' : null
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error importing audiobook:', error);
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