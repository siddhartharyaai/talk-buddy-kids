// Streaming TTS utility for real-time audio playback
// Reduces latency from 4-6s to ~300-600ms

export class StreamingTTSPlayer {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private audioQueue: { buffer: ArrayBuffer; sequence: number }[] = [];
  private isPlaying = false;
  private currentSequence = 0;
  private currentSource: AudioBufferSourceNode | null = null; // Track current playing source

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Get the project ref from current URL for WebSocket connection
        const projectRef = window.location.hostname.split('.')[0];
        const wsUrl = `wss://${projectRef}.functions.supabase.co/functions/v1/speak-stream`;
        
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('🔊 Connected to streaming TTS');
          resolve();
        };

        this.ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'audio') {
            this.handleAudioChunk(data.chunk, data.sequence);
          } else if (data.type === 'complete') {
            console.log('✅ Audio streaming complete');
          } else if (data.error) {
            console.error('❌ Streaming TTS error:', data.error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(error);
        };

        this.ws.onclose = () => {
          console.log('🔌 Streaming TTS connection closed');
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private async handleAudioChunk(base64Chunk: string, sequence: number): Promise<void> {
    try {
      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64Chunk);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Add to queue
      this.audioQueue.push({ buffer: bytes.buffer, sequence });
      
      // Sort by sequence to ensure correct order
      this.audioQueue.sort((a, b) => a.sequence - b.sequence);

      // Start playing if not already playing
      if (!this.isPlaying) {
        await this.playNextChunk();
      }
    } catch (error) {
      console.error('❌ Error handling audio chunk:', error);
    }
  }

  private async playNextChunk(): Promise<void> {
    if (this.audioQueue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const nextChunk = this.audioQueue.find(chunk => chunk.sequence === this.currentSequence);
    
    if (!nextChunk) {
      // Wait a bit for the next chunk to arrive
      setTimeout(() => this.playNextChunk(), 50);
      return;
    }

    try {
      // Remove the chunk from queue
      this.audioQueue = this.audioQueue.filter(chunk => chunk.sequence !== this.currentSequence);
      this.currentSequence++;

      // Decode and play audio
      const audioBuffer = await this.audioContext!.decodeAudioData(nextChunk.buffer);
      const source = this.audioContext!.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext!.destination);
      
      // Track current source for immediate stopping
      this.currentSource = source;
      
      source.onended = () => {
        this.currentSource = null;
        this.playNextChunk(); // Play next chunk when current ends
      };

      source.start(0);
    } catch (error) {
      console.error('❌ Error playing audio chunk:', error);
      // Continue with next chunk even if current fails
      this.playNextChunk();
    }
  }

  async speakSentence(text: string, voice = 'aura-2-amalthea-en'): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    // Reset sequence for new sentence
    this.currentSequence = 0;
    this.audioQueue = [];

    this.ws.send(JSON.stringify({ text, voice }));
  }

  async speakText(text: string, voice = 'aura-2-amalthea-en'): Promise<void> {
    // Split text into sentences for streaming playback
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    for (const sentence of sentences) {
      if (sentence.trim()) {
        await new Promise<void>((resolve) => {
          this.speakSentence(sentence.trim(), voice);
          
          // Wait for sentence to complete before starting next
          const checkComplete = () => {
            if (!this.isPlaying && this.audioQueue.length === 0) {
              resolve();
            } else {
              setTimeout(checkComplete, 100);
            }
          };
          
          // Small delay before checking to allow first chunk to arrive
          setTimeout(checkComplete, 200);
        });
      }
    }
  }

  // Enhanced pause method for barge-in support
  pause(): void {
    console.log('⏸️ Pausing streaming TTS for barge-in');
    this.audioQueue = [];
    this.isPlaying = false;
    this.currentSequence = 0;
    
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    
    if (this.ws) {
      this.ws.close();
    }
  }

  // SECTION C: Immediate stop function for barge-in
  stop(): void {
    console.log('🛑 Stopping streaming TTS immediately');
    
    // Stop current audio source immediately
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }
    
    // Clear audio queue to prevent further playback
    this.audioQueue = [];
    this.isPlaying = false;
    
    // Reset sequence counter
    this.currentSequence = 0;
    
    console.log('✅ Streaming TTS stopped');
  }

  disconnect(): void {
    // Stop any current playback before disconnecting
    this.stop();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

// Singleton instance for app-wide use
let streamingPlayer: StreamingTTSPlayer | null = null;

export const getStreamingTTSPlayer = async (): Promise<StreamingTTSPlayer> => {
  if (!streamingPlayer) {
    streamingPlayer = new StreamingTTSPlayer();
    await streamingPlayer.connect();
  }
  return streamingPlayer;
};

export const cleanupStreamingTTS = (): void => {
  if (streamingPlayer) {
    streamingPlayer.disconnect();
    streamingPlayer = null;
  }
};

// SECTION C: Export stop function for immediate barge-in
export const stopStreamingTTS = (): void => {
  if (streamingPlayer) {
    streamingPlayer.stop();
  }
};