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

    // Prepare form data for Deepgram API with cross-platform audio support
    const formData = new FormData();
    
    // Detect audio format from the first few bytes or use WebM as default
    let mimeType = 'audio/webm';
    let fileName = 'recording.webm';
    
    // Check for common audio file signatures
    if (binary.length >= 4) {
      const header = Array.from(binary.slice(0, 4)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (header.startsWith('1a45dfa3')) {
        // WebM/Matroska signature
        mimeType = 'audio/webm';
        fileName = 'recording.webm';
      } else if (header.startsWith('52494646')) {
        // RIFF header (WAV)
        mimeType = 'audio/wav';
        fileName = 'recording.wav';
      } else if (header.startsWith('49443303') || header.startsWith('fffb') || header.startsWith('fff3')) {
        // MP3 signatures
        mimeType = 'audio/mpeg';
        fileName = 'recording.mp3';
      } else if (binary.length >= 8 && Array.from(binary.slice(4, 8)).map(b => String.fromCharCode(b)).join('') === 'ftyp') {
        // MP4/M4A signature
        mimeType = 'audio/mp4';
        fileName = 'recording.m4a';
      }
    }
    
    console.log(`🎵 Detected audio format: ${mimeType}, file: ${fileName}`);
    
    const audioBlob = new Blob([binary], { type: mimeType });
    formData.append('file', audioBlob, fileName);
    formData.append('model', 'nova-2');
    formData.append('language', 'multi');
    formData.append('smart_format', 'true');
    formData.append('punctuate', 'true');
    formData.append('diarize', 'false');

    // Call Deepgram API using their file transcription endpoint
    const deepgramResponse = await fetch(
      "https://api.deepgram.com/v1/listen",
      {
        method: "POST",
        headers: {
          Authorization: `Token ${Deno.env.get("DEEPGRAM_API_KEY")}`,
        },
        body: formData
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