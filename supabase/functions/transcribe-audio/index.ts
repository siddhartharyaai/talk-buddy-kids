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

    // Convert base64 to binary for Deepgram with enhanced validation
    let binary: Uint8Array;
    try {
      // Clean the base64 string more thoroughly
      let cleanBase64 = audio;
      
      // Remove data URL prefix if present
      if (cleanBase64.includes(',')) {
        cleanBase64 = cleanBase64.split(',')[1];
      }
      
      // Remove any whitespace or invalid characters
      cleanBase64 = cleanBase64.replace(/[^A-Za-z0-9+/=]/g, '');
      
      // Validate base64 format
      if (cleanBase64.length % 4 !== 0) {
        console.warn('⚠️ Base64 padding issue, attempting to fix...');
        while (cleanBase64.length % 4 !== 0) {
          cleanBase64 += '=';
        }
      }
      
      console.log(`📏 Base64 length: ${cleanBase64.length} chars`);
      
      const binaryString = atob(cleanBase64);
      binary = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        binary[i] = binaryString.charCodeAt(i);
      }
      console.log(`🔄 Converted to binary: ${binary.length} bytes`);
      
      // Validate minimum size
      if (binary.length < 100) {
        throw new Error('Audio data too small, likely corrupt');
      }
      
    } catch (error) {
      console.error('❌ Base64 conversion error:', error);
      throw new Error(`Invalid audio data format: ${error.message}`);
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
    
    // Optimized settings for children's speech
    formData.append('model', 'nova-2');
    formData.append('language', 'multi');
    formData.append('smart_format', 'true');
    formData.append('punctuate', 'true');
    formData.append('diarize', 'false');
    
    // Enhanced settings for children's speech recognition
    formData.append('filler_words', 'true'); // Keep um, uh sounds children make
    formData.append('multichannel', 'false');
    formData.append('alternatives', '3'); // Get multiple alternatives for unclear speech
    formData.append('profanity_filter', 'false'); // Don't filter words children might mispronounce
    formData.append('redact', 'false');
    formData.append('search', 'false');
    formData.append('tag', 'child-speech');
    
    // Audio enhancement for children
    formData.append('detect_language', 'true');
    formData.append('detect_topics', 'false');
    formData.append('summarize', 'false');

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

    // Extract transcript text with improved handling for children's speech
    const alternatives = result?.results?.channels?.[0]?.alternatives || [];
    let text = "";
    
    if (alternatives.length > 0) {
      // Try the best alternative first
      text = alternatives[0]?.transcript?.trim() || "";
      
      // If first alternative is empty or very short, try others
      if (text.length < 2 && alternatives.length > 1) {
        for (let i = 1; i < alternatives.length; i++) {
          const altText = alternatives[i]?.transcript?.trim() || "";
          if (altText.length >= 2) {
            text = altText;
            console.log(`📝 Using alternative ${i + 1}: "${text}"`);
            break;
          }
        }
      }
    }
    
    // Enhanced fallback handling for children's unclear speech
    if (!text || text.length < 1) {
      console.log('⚠️ Empty transcription, audio may be unclear or too short');
      // Return a more helpful message for children
      text = "I didn't catch that. Can you try speaking a bit louder?";
    } else if (text.length < 3) {
      console.log(`⚠️ Very short transcription: "${text}" - might be unclear speech`);
      // For very short unclear results, ask for clarification
      text = `Did you say "${text}"? Can you say that again?`;
    }
    
    console.log(`✅ Final transcription result: "${text}"`);

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