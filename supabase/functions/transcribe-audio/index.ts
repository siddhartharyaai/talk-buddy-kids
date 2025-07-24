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
    console.log('🎤 Transcribe-audio function called');
    
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`📦 Received audio data: ${audio.length} characters`);

    // Robust base64 to binary conversion with error handling
    let binary: Uint8Array;
    try {
      // Remove data URL prefix if present (data:audio/webm;base64,)
      const cleanBase64 = audio.replace(/^data:audio\/[^;]+;base64,/, '');
      
      // Convert base64 to binary - this method is more robust
      const binaryString = atob(cleanBase64);
      binary = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binary[i] = binaryString.charCodeAt(i);
      }
      console.log(`🔄 Converted to binary: ${binary.length} bytes`);
    } catch (conversionError) {
      console.error('❌ Base64 conversion failed:', conversionError);
      throw new Error(`Invalid audio data format: ${conversionError.message}`);
    }

    // Validate binary data size
    if (binary.length < 100) {
      throw new Error('Audio data too small - likely corrupted');
    }

    // Call Deepgram API with Nova-2 (more stable than Nova-3) and optimal settings
    const deepgramResponse = await fetch(
      "https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&language=en&punctuate=true&diarize=false&utterances=false&encoding=linear16&sample_rate=16000",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${Deno.env.get("DEEPGRAM_API_KEY")}`,
          "Content-Type": "application/octet-stream"
        },
        body: binary
      }
    );

    if (!deepgramResponse.ok) {
      const errorText = await deepgramResponse.text();
      console.error('❌ Deepgram API error:', errorText);
      return new Response(
        JSON.stringify({ error: `Deepgram API error: ${errorText}` }),
        { 
          status: deepgramResponse.status, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const result = await deepgramResponse.json();
    console.log('📝 Deepgram response:', result);

    // Extract transcript text
    const text = result?.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() || "";
    
    console.log(`✅ Transcription result: "${text}"`);

    return new Response(
      JSON.stringify({ text }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
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