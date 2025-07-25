// Audio quality assessment utilities for children's speech

export interface TranscriptionResult {
  text: string;
  confidence: number;
  durationMs: number;
  isFinal: boolean;
}

export interface QualityAssessment {
  isLowQuality: boolean;
  reason: string;
  suggestions: string[];
}

export const isLowQuality = (transcript: string, confidence: number, durationMs: number): boolean => {
  // Low quality indicators for children's speech
  const tooShort = durationMs < 300; // Less than 300ms
  const tooQuiet = transcript.length < 3; // Very short result
  const lowConfidence = confidence < 0.6; // Below 60% confidence
  const hasFillers = /^(um|uh|er|hmm|mm|hm)$/i.test(transcript.trim()); // Just filler words
  const unintelligible = transcript.includes('[inaudible]') || transcript.includes('***');
  const repeated = /^(.+?)\1+$/.test(transcript.trim()); // Repeated patterns like "hi hi hi"
  
  return tooShort || tooQuiet || lowConfidence || hasFillers || unintelligible || repeated;
};

export const assessQuality = (transcript: string, confidence: number, durationMs: number): QualityAssessment => {
  const reasons: string[] = [];
  const suggestions: string[] = [];

  if (durationMs < 300) {
    reasons.push('too short');
    suggestions.push('Try speaking for a bit longer');
  }

  if (transcript.length < 3) {
    reasons.push('very short text');
    suggestions.push('Speak a little louder');
  }

  if (confidence < 0.6) {
    reasons.push('low confidence');
    suggestions.push('Try speaking more clearly');
  }

  if (/^(um|uh|er|hmm|mm|hm)$/i.test(transcript.trim())) {
    reasons.push('only filler words');
    suggestions.push('Take your time and try again');
  }

  if (transcript.includes('[inaudible]') || transcript.includes('***')) {
    reasons.push('unintelligible audio');
    suggestions.push('Move closer to your device');
  }

  if (/^(.+?)\1+$/.test(transcript.trim())) {
    reasons.push('repeated patterns');
    suggestions.push('What did you want to say?');
  }

  const isLowQuality = reasons.length > 0;
  const reason = isLowQuality ? reasons.join(', ') : 'good quality';

  return {
    isLowQuality,
    reason,
    suggestions: isLowQuality ? suggestions : []
  };
};

// Generate clarifier prompts for low quality speech
export const getClarifierPrompt = (transcript: string, assessment: QualityAssessment): string => {
  const prompts = [
    "Can you say that again?",
    "I didn't quite catch that. Try again?",
    "What did you say?",
    "Can you speak a bit louder?",
    "Tell me again, please?",
    "I'm listening - what would you like to say?",
    "Can you repeat that for me?",
    "Say that one more time?"
  ];

  // Pick a random clarifier prompt
  return prompts[Math.floor(Math.random() * prompts.length)];
};