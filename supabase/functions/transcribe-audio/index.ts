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
    console.log('🎤 Transcribe-audio function called (Step 3: Deepgram STT Pipeline)');
    
    // Self-test messages for validation
    const testMessages = {
      english: "Hello Buddy",
      hindi: "नमस्ते दोस्त"
    };
    console.log('📋 Self-test messages ready:', testMessages);
    
    const { audio } = await req.json();
    
    if (!audio) {
      throw new Error('No audio data provided');
    }

    console.log(`📦 Received audio data: ${audio.length} characters`);

    // Convert base64 to binary for Deepgram with better error handling
    let binary: Uint8Array;
    try {
      // Remove data URL prefix if present
      const cleanBase64 = audio.replace(/^data:audio\/[^;]+;base64,/, '');
      const binaryString = atob(cleanBase64);
      binary = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binary[i] = binaryString.charCodeAt(i);
      }
      console.log(`🔄 Converted to binary: ${binary.length} bytes`);
    } catch (error) {
      console.error('❌ Base64 conversion error:', error);
      throw new Error('Invalid audio data format');
    }

    // Handle multiple audio formats for cross-platform compatibility
    const formData = new FormData();
    
    // Try different content types based on data characteristics
    let contentType = 'audio/webm';
    if (binary[0] === 0x66 && binary[1] === 0x4C) contentType = 'audio/flac';
    else if (binary[0] === 0x49 && binary[1] === 0x44) contentType = 'audio/mp3';
    else if (binary[0] === 0x52 && binary[1] === 0x49) contentType = 'audio/wav';
    
    const audioBlob = new Blob([binary], { type: contentType });
    formData.append('file', audioBlob, `recording.${contentType.split('/')[1]}`);
    formData.append('model', 'whisper-1'); // Use OpenAI Whisper for better compatibility
    
    // Call OpenAI Whisper API as more reliable fallback
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI Whisper error:', errorText);
      throw new Error(`Transcription failed: ${errorText}`);
    }

    const result = await response.json();
    console.log('✅ OpenAI Whisper transcription successful');
    const text = result.text?.trim() || '';
    
    return new Response(
      JSON.stringify({ text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
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