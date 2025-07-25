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

  const upgradeHeader = req.headers.get("upgrade") || "";
  
  if (upgradeHeader.toLowerCase() !== "websocket") {
    return new Response("Expected WebSocket connection", { status: 400 });
  }

  try {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    console.log('🔊 Streaming TTS WebSocket connection established');

    socket.onopen = () => {
      console.log('🚀 Client connected to streaming TTS');
    };

    socket.onmessage = async (event) => {
      try {
        const { text, voice = 'aura-2-amalthea-en' } = JSON.parse(event.data);
        
        if (!text) {
          socket.send(JSON.stringify({ error: 'No text provided' }));
          return;
        }

        console.log('🎵 Streaming TTS for text:', text.substring(0, 50));

        const apiKey = Deno.env.get("DEEPGRAM_API_KEY");
        if (!apiKey) {
          socket.send(JSON.stringify({ error: 'DEEPGRAM_API_KEY not configured' }));
          return;
        }

        // Create WebSocket connection to Deepgram streaming TTS
        const deepgramWs = new WebSocket(
          `wss://api.deepgram.com/v1/speak?model=${voice}&encoding=mp3&container=mp3`,
          {
            headers: {
              'Authorization': `Token ${apiKey}`
            }
          }
        );

        deepgramWs.onopen = () => {
          console.log('🔗 Connected to Deepgram streaming TTS');
          // Send the text to generate
          deepgramWs.send(JSON.stringify({ text }));
        };

        deepgramWs.onmessage = (deepgramEvent) => {
          try {
            const data = JSON.parse(deepgramEvent.data);
            
            if (data.type === 'audio') {
              // Forward audio chunk to client
              socket.send(JSON.stringify({
                type: 'audio',
                chunk: data.chunk,
                sequence: data.sequence
              }));
            } else if (data.type === 'metadata') {
              console.log('📊 Deepgram metadata:', data);
            } else if (data.type === 'flush') {
              // Audio generation complete
              socket.send(JSON.stringify({ type: 'complete' }));
              deepgramWs.close();
            }
          } catch (parseError) {
            console.error('❌ Error parsing Deepgram response:', parseError);
          }
        };

        deepgramWs.onerror = (error) => {
          console.error('❌ Deepgram WebSocket error:', error);
          socket.send(JSON.stringify({ 
            error: 'Deepgram streaming error',
            details: error.toString()
          }));
        };

        deepgramWs.onclose = () => {
          console.log('🔌 Deepgram WebSocket closed');
        };

      } catch (error) {
        console.error('❌ Error processing message:', error);
        socket.send(JSON.stringify({ 
          error: 'Processing error',
          details: error.message 
        }));
      }
    };

    socket.onerror = (error) => {
      console.error('❌ Client WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('📱 Client disconnected from streaming TTS');
    };

    return response;

  } catch (error) {
    console.error('❌ WebSocket upgrade error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});