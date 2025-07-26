import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Quality assessment utility
const isLowQuality = (transcript: string, confidence: number, durationMs: number): boolean => {
  // Low quality indicators for children's speech
  const tooShort = durationMs < 300; // Less than 300ms
  const tooQuiet = transcript.length < 3; // Very short result
  const lowConfidence = confidence < 0.6; // Below 60% confidence
  const hasFillers = /^(um|uh|er|hmm|mm)$/i.test(transcript.trim()); // Just filler words
  const unintelligible = transcript.includes('[inaudible]') || transcript.includes('***');
  
  console.log(`🔍 Quality check: duration=${durationMs}ms, confidence=${confidence}, length=${transcript.length}, text="${transcript}"`);
  
  return tooShort || tooQuiet || lowConfidence || hasFillers || unintelligible;
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🎤 Streaming transcribe function called');

  // Check if this is a WebSocket upgrade request
  if (req.headers.get("upgrade") !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  const { socket, response } = Deno.upgradeWebSocket(req);
  let deepgramWs: WebSocket | null = null;
  let startTime = Date.now();

  socket.onopen = () => {
    console.log('🔌 Client WebSocket connected');
    
    // Connect to Deepgram streaming API
    const deepgramApiKey = Deno.env.get("DEEPGRAM_API_KEY");
    if (!deepgramApiKey) {
      throw new Error("DEEPGRAM_API_KEY environment variable is not set");
    }
    
    const deepgramUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=multi&smart_format=true&punctuate=true&filler_words=true&alternatives=3&interim_results=true&endpointing=300`;
    
    try {
      // Construct URL with auth token
      const authUrl = `${deepgramUrl}&token=${deepgramApiKey}`;
      deepgramWs = new WebSocket(authUrl);
      
      deepgramWs.onopen = () => {
        console.log('✅ Connected to Deepgram streaming API');
        socket.send(JSON.stringify({ type: 'connected' }));
      };

      deepgramWs.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📝 Deepgram message:', data);

          if (data.type === 'Results') {
            const channel = data.channel;
            const alternatives = channel?.alternatives || [];
            
            if (alternatives.length > 0) {
              const transcript = alternatives[0]?.transcript || '';
              const confidence = alternatives[0]?.confidence || 0;
              const isFinal = channel?.is_final || false;
              
              // Calculate duration from start
              const durationMs = Date.now() - startTime;
              
              // Send partial result to client
              const result = {
                type: 'partial',
                text: transcript,
                confidence: confidence,
                isFinal: isFinal,
                durationMs: durationMs
              };

              socket.send(JSON.stringify(result));
              
              // If final, assess quality
              if (isFinal && transcript.trim()) {
                const isLowQualityResult = isLowQuality(transcript, confidence, durationMs);
                
                const finalResult = {
                  type: 'final',
                  text: transcript,
                  confidence: confidence,
                  durationMs: durationMs,
                  isLowQuality: isLowQualityResult
                };
                
                console.log(`✅ Final transcription: "${transcript}" (quality: ${isLowQualityResult ? 'LOW' : 'GOOD'})`);
                socket.send(JSON.stringify(finalResult));
                
                // Reset timer for next utterance
                startTime = Date.now();
              }
            }
          } else if (data.type === 'Metadata') {
            console.log('📊 Deepgram metadata:', data);
          }
        } catch (error) {
          console.error('❌ Error processing Deepgram message:', error);
        }
      };

      deepgramWs.onerror = (error) => {
        console.error('❌ Deepgram WebSocket error:', error);
        socket.send(JSON.stringify({ 
          type: 'error', 
          message: 'Deepgram connection error' 
        }));
      };

      deepgramWs.onclose = () => {
        console.log('🔌 Deepgram WebSocket closed');
        socket.send(JSON.stringify({ type: 'deepgram_closed' }));
      };

    } catch (error) {
      console.error('❌ Failed to connect to Deepgram:', error);
      socket.send(JSON.stringify({ 
        type: 'error', 
        message: 'Failed to connect to Deepgram' 
      }));
    }
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📤 Received from client:', data.type);

      if (data.type === 'audio' && deepgramWs?.readyState === WebSocket.OPEN) {
        // Forward audio data to Deepgram
        const audioBuffer = Uint8Array.from(atob(data.data), c => c.charCodeAt(0));
        deepgramWs.send(audioBuffer);
      } else if (data.type === 'start_recording') {
        startTime = Date.now();
        console.log('🎙️ Recording started');
      } else if (data.type === 'stop_recording') {
        console.log('⏹️ Recording stopped');
        // Send close frame to Deepgram to finalize transcription
        if (deepgramWs?.readyState === WebSocket.OPEN) {
          deepgramWs.send(JSON.stringify({ type: 'CloseStream' }));
        }
      }
    } catch (error) {
      console.error('❌ Error processing client message:', error);
    }
  };

  socket.onclose = () => {
    console.log('🔌 Client WebSocket disconnected');
    if (deepgramWs) {
      deepgramWs.close();
    }
  };

  socket.onerror = (error) => {
    console.error('❌ Client WebSocket error:', error);
    if (deepgramWs) {
      deepgramWs.close();
    }
  };

  return response;
});