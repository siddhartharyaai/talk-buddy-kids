// Modern cross-platform audio recording for Buddy
import { supabase } from '@/integrations/supabase/client';

export interface ModernRecordingResult {
  text: string;
  method: 'deepgram' | 'fallback';
  duration: number;
}

export class ModernAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;

  async startRecording(): Promise<void> {
    try {
      // Get optimized audio stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      // Detect best format
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'audio/webm';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'audio/mp4';
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = 'audio/wav';
          }
        }
      }

      this.mediaRecorder = new MediaRecorder(this.stream, { mimeType });
      this.audioChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100);
      console.log(`✅ Recording started with ${mimeType}`);

    } catch (error) {
      console.error('❌ Recording start failed:', error);
      throw new Error('Microphone access failed');
    }
  }

  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error('No recording in progress'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { 
          type: this.mediaRecorder?.mimeType || 'audio/webm' 
        });
        this.cleanup();
        resolve(audioBlob);
      };

      this.mediaRecorder.stop();
    });
  }

  private cleanup(): void {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    this.mediaRecorder = null;
    this.audioChunks = [];
  }

  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

// Multi-method transcription with fallbacks
export async function transcribeAudioModern(audioBlob: Blob): Promise<ModernRecordingResult> {
  const startTime = Date.now();

  // Method 1: Try Deepgram via edge function
  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
    const base64Audio = btoa(binaryString);

    const { data, error } = await supabase.functions.invoke('transcribe-audio', {
      body: { audio: base64Audio }
    });

    if (!error && data?.text && data.text.trim().length > 0) {
      return {
        text: data.text.trim(),
        method: 'deepgram',
        duration: Date.now() - startTime
      };
    }
  } catch (error) {
    console.warn('⚠️ Deepgram transcription failed:', error);
  }

  // Method 2: Browser Speech Recognition API fallback
  try {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const result = await transcribeWithWebSpeech();
      if (result && result.trim().length > 0) {
        return {
          text: result.trim(),
          method: 'fallback',
          duration: Date.now() - startTime
        };
      }
    }
  } catch (error) {
    console.warn('⚠️ Web Speech API failed:', error);
  }

  throw new Error('All transcription methods failed');
}

// Web Speech API transcription
async function transcribeWithWebSpeech(): Promise<string> {
  return new Promise((resolve, reject) => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      reject(new Error('Speech Recognition not supported'));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      resolve(transcript);
    };

    recognition.onerror = (event: any) => {
      reject(new Error(`Speech recognition error: ${event.error}`));
    };

    recognition.start();

    // Timeout after 5 seconds
    setTimeout(() => {
      recognition.stop();
      reject(new Error('Speech recognition timeout'));
    }, 5000);
  });
}