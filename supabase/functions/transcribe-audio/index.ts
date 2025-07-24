import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🎤 Transcribe-audio function called (OpenAI Whisper Pipeline)');
    
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`📦 Received audio data: ${audio.length} characters`);

    // Convert base64 to binary for OpenAI Whisper (better WebM support)
    const binary = Uint8Array.from(atob(audio), c => c.charCodeAt(0));
    console.log(`🔄 Converted to binary: ${binary.length} bytes (WebM format)`);

    // Prepare form data for OpenAI Whisper
    const formData = new FormData();
    const blob = new Blob([binary], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');

    console.log('🚀 Calling OpenAI Whisper API...');

    // Call OpenAI Whisper API (more robust with WebM format)
    const whisperResponse = await fetch(
      "https://api.openai.com/v1/audio/transcriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        },
        body: formData
      }
    );

    if (!whisperResponse.ok) {
      const errorText = await whisperResponse.text();
      console.error(`❌ OpenAI Whisper API error: ${errorText}`);
      return new Response(
        JSON.stringify({ error: `OpenAI API error: ${errorText}` }),
        { 
          status: whisperResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const whisperResult = await whisperResponse.json();
    console.log('✅ OpenAI Whisper transcription result:', whisperResult);

    const transcribedText = whisperResult.text || '';
    
    if (!transcribedText.trim()) {
      console.log('⚠️ Empty transcription - audio may be silence or unclear');
      return new Response(
        JSON.stringify({ text: '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📝 Final transcription: "${transcribedText}"`);
    
    return new Response(
      JSON.stringify({ text: transcribedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Transcribe-audio error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});