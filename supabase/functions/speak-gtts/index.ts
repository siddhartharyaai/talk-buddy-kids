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
    const { text, lang } = await req.json();
    if (!text) throw new Error("no text");
    
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not configured");
    }
    
    const voiceName = lang === "hi-IN"
      ? "voice:hi-IN-Standard-Leda"
      : "voice:en-IN-Standard-Leda";
      
    console.log('🔊 Generating speech for:', { text: text.substring(0, 50), lang, voiceName });
    
    const res = await fetch(
      `https://texttospeech.googleusercontent.com/v1beta1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text },
          voice: { name: voiceName, languageCode: lang },
          audioConfig: { audioEncoding: "MP3" }
        })
      }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Google TTS API error:', res.status, errorText);
      return new Response(JSON.stringify({ error: `TTS API error: ${res.status}` }), { 
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const { audioContent } = await res.json();
    console.log('✅ Speech generated successfully');
    
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