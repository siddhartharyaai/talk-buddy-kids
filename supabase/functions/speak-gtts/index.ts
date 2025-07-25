import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper function to convert large arrays to base64 without stack overflow
function convertToBase64Chunked(uint8Array: Uint8Array): string {
  const CHUNK_SIZE = 32768; // 32KB chunks
  let result = '';
  
  for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
    const chunk = uint8Array.slice(i, i + CHUNK_SIZE);
    result += String.fromCharCode(...chunk);
  }
  
  return btoa(result);
}

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🔊 Speak-gtts function called (Step 4: OpenAI TTS Pipeline)');
    
    const { text, style } = await req.json(); 
    if (!text) throw new Error("no text");
    
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }
    
    console.log('🔊 Generating speech with OpenAI TTS:', { 
      text: text.substring(0, 50), 
      style: style || 'normal' 
    });
    
    // OpenAI voice selection based on style
    const voice = style === 'singing' ? 'nova' : 'alloy';
    console.log(`🎵 Using OpenAI voice: ${voice} for style: ${style || 'normal'}`);
    
    // Use OpenAI TTS API instead - much faster than Deepgram
    const res = await fetch(
      'https://api.openai.com/v1/audio/speech',
      {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "tts-1", // Fast model
          input: text,
          voice: voice,
          response_format: 'mp3'
        })
      }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ OpenAI TTS API error:', res.status, errorText);
      return new Response(JSON.stringify({ error: `OpenAI TTS API error: ${res.status}` }), { 
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Get audio as array buffer
    const audioBuffer = await res.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.error('❌ No audio content received from OpenAI TTS');
      throw new Error('No audio content received from OpenAI TTS');
    }

    // Convert to base64 safely (chunked to avoid stack overflow)
    const audioContent = convertToBase64Chunked(new Uint8Array(audioBuffer));
    
    console.log('✅ Raw audio content length:', audioContent.length);
    console.log('✅ Audio content preview (first 100 chars):', audioContent.substring(0, 100));
    
    console.log('✅ Speech generated successfully with OpenAI TTS');
    
    return new Response(JSON.stringify({ audioContent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (e) {
    console.error('❌ Error in speak-gtts function:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});