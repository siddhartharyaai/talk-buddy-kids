// Audio chime utilities for recording feedback

export class AudioChimes {
  private static audioContext: AudioContext | null = null;
  
  static async getAudioContext(): Promise<AudioContext> {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    
    // Resume context if suspended (required for autoplay policies)
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    
    return this.audioContext;
  }

  // Generate synthetic start chime (rising tone)
  static async playStartChime(): Promise<void> {
    try {
      const context = await this.getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Rising tone: 440Hz to 880Hz over 200ms
      oscillator.frequency.setValueAtTime(440, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.2);
      
      // Envelope: fade in and out
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, context.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.2);
      
      oscillator.type = 'sine';
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.2);
      
      console.log('🔔 Playing start chime');
      
    } catch (error) {
      console.error('❌ Failed to play start chime:', error);
    }
  }

  // Generate synthetic stop chime (falling tone)
  static async playStopChime(): Promise<void> {
    try {
      const context = await this.getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Falling tone: 660Hz to 330Hz over 150ms
      oscillator.frequency.setValueAtTime(660, context.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(330, context.currentTime + 0.15);
      
      // Envelope: fade in and out
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.25, context.currentTime + 0.03);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.15);
      
      oscillator.type = 'sine';
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.15);
      
      console.log('🔕 Playing stop chime');
      
    } catch (error) {
      console.error('❌ Failed to play stop chime:', error);
    }
  }

  // Success chime (for when transcription completes successfully)
  static async playSuccessChime(): Promise<void> {
    try {
      const context = await this.getAudioContext();
      
      // Play two-tone success sound
      for (let i = 0; i < 2; i++) {
        const oscillator = context.createOscillator();
        const gainNode = context.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(context.destination);
        
        const startTime = context.currentTime + (i * 0.1);
        const frequency = i === 0 ? 523 : 659; // C5 to E5
        
        oscillator.frequency.setValueAtTime(frequency, startTime);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.02);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.08);
        
        oscillator.type = 'sine';
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.08);
      }
      
      console.log('✅ Playing success chime');
      
    } catch (error) {
      console.error('❌ Failed to play success chime:', error);
    }
  }

  // Error chime (for transcription failures)
  static async playErrorChime(): Promise<void> {
    try {
      const context = await this.getAudioContext();
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);
      
      // Lower, slightly dissonant tone
      oscillator.frequency.setValueAtTime(220, context.currentTime);
      oscillator.frequency.linearRampToValueAtTime(200, context.currentTime + 0.3);
      
      gainNode.gain.setValueAtTime(0, context.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, context.currentTime + 0.05);
      gainNode.gain.linearRampToValueAtTime(0, context.currentTime + 0.3);
      
      oscillator.type = 'sawtooth';
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.3);
      
      console.log('❌ Playing error chime');
      
    } catch (error) {
      console.error('❌ Failed to play error chime:', error);
    }
  }
}