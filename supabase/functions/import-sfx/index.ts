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
    const { freesoundId, name } = await req.json();
    
    if (!freesoundId) {
      throw new Error('Freesound ID is required');
    }

    const apiKey = Deno.env.get('FREESOUND_API_KEY');
    if (!apiKey) {
      throw new Error('FREESOUND_API_KEY not configured in Supabase secrets');
    }

    console.log(`Importing Freesound SFX: ${freesoundId}`);

    // Get sound info from Freesound API
    const infoResponse = await fetch(`https://freesound.org/apiv2/sounds/${freesoundId}/?token=${apiKey}`);
    
    if (!infoResponse.ok) {
      throw new Error(`Failed to fetch sound info: ${infoResponse.statusText}`);
    }

    const soundInfo = await infoResponse.json();
    console.log('Freesound info:', soundInfo.name, soundInfo.license);

    // Check if it's CC licensed
    if (!soundInfo.license.includes('Creative Commons')) {
      console.warn(`Warning: Sound ${freesoundId} may not be CC licensed: ${soundInfo.license}`);
    }

    // Get download URL
    const downloadResponse = await fetch(`https://freesound.org/apiv2/sounds/${freesoundId}/download/?token=${apiKey}`);
    
    if (!downloadResponse.ok) {
      throw new Error(`Failed to get download URL: ${downloadResponse.statusText}`);
    }

    const audioBlob = await downloadResponse.blob();
    console.log('Downloaded audio blob, size:', audioBlob.size);

    // Determine file extension from original filename or content type
    const originalName = soundInfo.original_filename || soundInfo.name;
    const extension = originalName.split('.').pop()?.toLowerCase() || 'wav';
    const contentType = audioBlob.type || 'audio/wav';

    // Create metadata
    const sfxMetadata = {
      id: `freesound_${freesoundId}`,
      name: name || soundInfo.name || `Sound ${freesoundId}`,
      description: soundInfo.description || '',
      tags: soundInfo.tags || [],
      license: soundInfo.license,
      author: soundInfo.username,
      duration: soundInfo.duration,
      freesoundId: freesoundId,
      originalFilename: originalName,
      contentType: contentType,
      createdAt: new Date().toISOString(),
      source: 'freesound'
    };

    // Upload audio file
    const audioFileName = `sfx/freesound_${freesoundId}_${sanitizeFileName(sfxMetadata.name)}.${extension}`;
    const { error: audioError } = await supabase.storage
      .from('content')
      .upload(audioFileName, audioBlob, {
        cacheControl: '3600',
        upsert: true,
        contentType: contentType
      });

    if (audioError) {
      console.error('Audio upload error:', audioError);
      throw new Error(`Failed to store audio: ${audioError.message}`);
    }

    // Upload metadata JSON
    const metadataFileName = `sfx/freesound_${freesoundId}_${sanitizeFileName(sfxMetadata.name)}.json`;
    const metadataBlob = new Blob([JSON.stringify(sfxMetadata, null, 2)], { type: 'application/json' });
    
    const { error: metadataError } = await supabase.storage
      .from('content')
      .upload(metadataFileName, metadataBlob, {
        cacheControl: '3600',
        upsert: true
      });

    if (metadataError) {
      console.error('Metadata upload error:', metadataError);
      throw new Error(`Failed to store metadata: ${metadataError.message}`);
    }

    console.log(`Successfully imported SFX: ${sfxMetadata.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        sfx: {
          id: sfxMetadata.id,
          name: sfxMetadata.name,
          audioFile: audioFileName,
          metadataFile: metadataFileName,
          license: sfxMetadata.license,
          duration: sfxMetadata.duration
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error importing SFX:', error);
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