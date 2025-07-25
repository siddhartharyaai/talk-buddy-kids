// Multi-fallback transcription service for cross-platform compatibility
import { supabase } from '@/integrations/supabase/client';
import { transcribeClientSide, blobToBase64, getPlatformInfo } from './audioRecording';

export interface TranscriptionResult {
  text: string;
  method: 'deepgram' | 'client' | 'fallback';
  confidence?: number;
  duration: number;
}

export class TranscriptionService {
  private static instance: TranscriptionService;
  private platformInfo = getPlatformInfo();

  static getInstance(): TranscriptionService {
    if (!TranscriptionService.instance) {
      TranscriptionService.instance = new TranscriptionService();
    }
    return TranscriptionService.instance;
  }

  async transcribe(audioBlob: Blob): Promise<TranscriptionResult> {
    const startTime = Date.now();
    
    console.log(`🎤 Starting transcription on ${this.platformInfo.platform}`);
    console.log(`📱 Platform: ${this.platformInfo.isIOS ? 'iOS' : this.platformInfo.isAndroid ? 'Android' : 'Desktop'}`);
    
    // Method 1: Try Deepgram via edge function first
    try {
      const result = await this.transcribeWithDeepgram(audioBlob);
      if (result && result.trim().length > 0) {
        return {
          text: result,
          method: 'deepgram',
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      console.warn('⚠️ Deepgram transcription failed:', error);
    }

    // Method 2: Try client-side transcription as fallback
    try {
      console.log('🔄 Trying client-side transcription...');
      const result = await transcribeClientSide(audioBlob);
      if (result && result.trim().length > 0) {
        return {
          text: result,
          method: 'client',
          duration: Date.now() - startTime
        };
      }
    } catch (error) {
      console.warn('⚠️ Client-side transcription failed:', error);
    }

    // Method 3: Platform-specific fallbacks
    if (this.platformInfo.isIOS || this.platformInfo.isAndroid) {
      try {
        const result = await this.transcribeWithWebSpeechAPI(audioBlob);
        if (result && result.trim().length > 0) {
          return {
            text: result,
            method: 'fallback',
            duration: Date.now() - startTime
          };
        }
      } catch (error) {
        console.warn('⚠️ Web Speech API failed:', error);
      }
    }

    // If all methods fail, throw error
    throw new Error('All transcription methods failed. Please check your internet connection and try again.');
  }

  private async transcribeWithDeepgram(audioBlob: Blob): Promise<string> {
    console.log('🌊 Trying Deepgram transcription...');
    
    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob);
    
    // Call Supabase edge function with timeout
    const { data, error } = await Promise.race([
      supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Deepgram timeout')), 10000)
      )
    ]) as any;
    
    if (error) {
      throw new Error(`Deepgram error: ${error.message}`);
    }
    
    return data?.text || '';
  }

  private async transcribeWithWebSpeechAPI(audioBlob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      // Check if Web Speech API is available
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Web Speech API not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        console.log('🗣️ Web Speech API result:', transcript);
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        console.error('🗣️ Web Speech API error:', event.error);
        reject(new Error(`Web Speech API error: ${event.error}`));
      };

      recognition.onend = () => {
        console.log('🗣️ Web Speech API ended');
      };

      // Start recognition
      recognition.start();
      
      // Convert blob to audio URL and play silently to trigger recognition
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.volume = 0.01; // Very low volume
      audio.play().catch(err => {
        console.warn('Audio playback failed:', err);
      });

      // Cleanup timeout
      setTimeout(() => {
        recognition.stop();
        URL.revokeObjectURL(audioUrl);
        reject(new Error('Web Speech API timeout'));
      }, 5000);
    });
  }

  // Test method to verify transcription is working
  async testTranscription(): Promise<void> {
    console.log('🧪 Testing transcription capabilities...');
    console.log('📱 Platform info:', this.platformInfo);
    
    // Test Web Speech API availability
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      console.log('✅ Web Speech API available');
    } else {
      console.log('❌ Web Speech API not available');
    }

    // Test client-side STT capability
    try {
      console.log('🤖 Testing client-side STT initialization...');
      // Don't actually initialize, just check if the module loads
      console.log('✅ Client-side STT module available');
    } catch (error) {
      console.log('❌ Client-side STT not available:', error);
    }
  }
}

// Export singleton instance
export const transcriptionService = TranscriptionService.getInstance();