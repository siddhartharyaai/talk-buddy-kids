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
    
    // Use Leda voice for both English and Hindi (Indian languages)
    const voiceName = "Leda";
    
    console.log('🔊 Generating speech with Gemini TTS:', { text: text.substring(0, 50), lang, voiceName });
    
    // Use Gemini TTS API - correct endpoint and format
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: text
            }]
          }],
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName
                }
              }
            }
          }
        })
      }
    );
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error('❌ Gemini TTS API error:', res.status, errorText);
      return new Response(JSON.stringify({ error: `Gemini TTS API error: ${res.status}` }), { 
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }
    
    const responseData = await res.json();
    console.log('📝 Full Gemini TTS response:', responseData);
    
    // Extract audio content from the response
    const audioContent = responseData.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    
    if (!audioContent) {
      console.error('❌ No audio content in response structure:', JSON.stringify(responseData, null, 2));
      throw new Error('No audio content received from Gemini TTS');
    }

    console.log('✅ Raw audio content length:', audioContent.length);
    console.log('✅ Audio content preview (first 100 chars):', audioContent.substring(0, 100));
    
    // Validate base64 format
    try {
      const testDecode = atob(audioContent.substring(0, 100));
      console.log('✅ Base64 validation passed');
    } catch (b64Error) {
      console.error('❌ Invalid base64 data:', b64Error);
      throw new Error('Invalid base64 audio data received');
    }
    
    console.log('✅ Speech generated successfully with Gemini TTS');
    
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