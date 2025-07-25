// Cross-platform audio recording utilities with fallback support
import { pipeline } from '@huggingface/transformers';

// Supported audio formats in order of preference
const AUDIO_FORMATS = [
  { mimeType: 'audio/webm;codecs=opus', extension: 'webm' },
  { mimeType: 'audio/webm', extension: 'webm' },
  { mimeType: 'audio/mp4', extension: 'mp4' },
  { mimeType: 'audio/mpeg', extension: 'mp3' },
  { mimeType: 'audio/wav', extension: 'wav' },
  { mimeType: 'audio/ogg', extension: 'ogg' },
];

// Client-side STT instance (lazy loaded)
let sttPipeline: any = null;

export interface AudioRecordingConfig {
  sampleRate?: number;
  channelCount?: number;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
}

export interface AudioRecordingResult {
  blob: Blob;
  format: string;
  duration: number;
}

export class CrossPlatformAudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private startTime: number = 0;
  private selectedFormat: { mimeType: string; extension: string } | null = null;

  constructor(private config: AudioRecordingConfig = {}) {
    this.config = {
      sampleRate: 16000, // Standard for STT
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
      ...config
    };
  }

  // Detect best supported audio format for current browser
  private detectSupportedFormat(): { mimeType: string; extension: string } {
    for (const format of AUDIO_FORMATS) {
      if (MediaRecorder.isTypeSupported(format.mimeType)) {
        console.log(`✅ Using audio format: ${format.mimeType}`);
        return format;
      }
    }
    
    // Fallback to basic format
    console.warn('⚠️ No preferred format supported, using fallback');
    return { mimeType: 'audio/webm', extension: 'webm' };
  }

  async startRecording(): Promise<void> {
    try {
      // Get user media with optimized constraints
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.config.sampleRate,
          channelCount: this.config.channelCount,
          echoCancellation: this.config.echoCancellation,
          noiseSuppression: this.config.noiseSuppression,
          autoGainControl: this.config.autoGainControl
        }
      });

      // Detect and use best supported format
      this.selectedFormat = this.detectSupportedFormat();
      
      // Create MediaRecorder with detected format
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: this.selectedFormat.mimeType,
        audioBitsPerSecond: 128000 // Balanced quality/size
      });

      this.audioChunks = [];
      this.startTime = Date.now();

      // Set up event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log(`📹 Audio chunk: ${event.data.size} bytes`);
        }
      };

      // Start recording with frequent chunks for better processing
      this.mediaRecorder.start(100);
      console.log(`🎙️ Recording started with ${this.selectedFormat.mimeType}`);

    } catch (error) {
      console.error('❌ Failed to start recording:', error);
      throw new Error(`Microphone access failed: ${error.message}`);
    }
  }

  async stopRecording(): Promise<AudioRecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.selectedFormat) {
        reject(new Error('Recording not started'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        try {
          const duration = Date.now() - this.startTime;
          const blob = new Blob(this.audioChunks, { 
            type: this.selectedFormat!.mimeType 
          });
          
          console.log(`🎵 Recording completed: ${blob.size} bytes, ${duration}ms`);
          
          resolve({
            blob,
            format: this.selectedFormat!.extension,
            duration
          });

          // Cleanup
          this.cleanup();
        } catch (error) {
          reject(error);
        }
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

  // Check if recording is currently active
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording';
  }
}

// Convert blob to base64 for API transmission
export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Initialize client-side STT pipeline (lazy loading)
const initializeClientSTT = async () => {
  if (!sttPipeline) {
    try {
      console.log('🤖 Initializing client-side STT...');
      sttPipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        { 
          device: 'webgpu', // Use WebGPU if available, fallback to CPU
          dtype: 'fp32'
        }
      );
      console.log('✅ Client-side STT initialized');
    } catch (error) {
      console.warn('⚠️ WebGPU not available, falling back to CPU');
      try {
        sttPipeline = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-tiny.en',
          { device: 'cpu' }
        );
        console.log('✅ Client-side STT initialized (CPU)');
      } catch (cpuError) {
        console.error('❌ Failed to initialize client-side STT:', cpuError);
        throw cpuError;
      }
    }
  }
  return sttPipeline;
};

// Client-side transcription as fallback
export const transcribeClientSide = async (audioBlob: Blob): Promise<string> => {
  try {
    const pipeline = await initializeClientSTT();
    
    // Convert blob to array buffer for processing
    const arrayBuffer = await audioBlob.arrayBuffer();
    
    // Transcribe using client-side model
    const result = await pipeline(arrayBuffer);
    
    console.log('✅ Client-side transcription completed');
    return result.text || '';
    
  } catch (error) {
    console.error('❌ Client-side transcription failed:', error);
    throw new Error(`Client-side transcription failed: ${error.message}`);
  }
};

// Platform detection utilities
export const getPlatformInfo = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform.toLowerCase();
  
  return {
    isIOS: /ipad|iphone|ipod/.test(userAgent),
    isAndroid: /android/.test(userAgent),
    isMobile: /mobi|android|touch|mini/.test(userAgent),
    isDesktop: !(/mobi|android|touch|mini/.test(userAgent)),
    isSafari: /safari/.test(userAgent) && !/chrome/.test(userAgent),
    isChrome: /chrome/.test(userAgent),
    isFirefox: /firefox/.test(userAgent),
    platform: platform,
    userAgent: userAgent
  };
};

// Check WebGPU support
export const checkWebGPUSupport = async (): Promise<boolean> => {
  try {
    if (!('gpu' in navigator)) {
      return false;
    }
    
    const adapter = await (navigator as any).gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
};