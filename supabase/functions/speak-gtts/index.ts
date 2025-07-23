import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text) throw new Error("no text");
    
    const apiKey = Deno.env.get("DEEPGRAM_API_KEY");
    if (!apiKey) {
      throw new Error("DEEPGRAM_API_KEY not configured");
    }
    
    console.log('🔊 Generating speech with Deepgram TTS:', { text: text.substring(0, 50) });
    
    // Use Deepgram TTS API
    const res = await fetch(
      `https://api.deepgram.com/v1/speak?model=aura-2-amalthea-en`,
      {
        method: "POST",
        headers: { 
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: text
        })
      }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Deepgram TTS API error:', res.status, errorText);
      return new Response(JSON.stringify({ error: `Deepgram TTS API error: ${res.status}` }), { 
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    // Get audio as array buffer
    const audioBuffer = await res.arrayBuffer();
    
    if (!audioBuffer || audioBuffer.byteLength === 0) {
      console.error('❌ No audio content received from Deepgram TTS');
      throw new Error('No audio content received from Deepgram TTS');
    }

    // Convert to base64
    const audioContent = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    
    console.log('✅ Raw audio content length:', audioContent.length);
    console.log('✅ Audio content preview (first 100 chars):', audioContent.substring(0, 100));
    
    console.log('✅ Speech generated successfully with Deepgram TTS');
    
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