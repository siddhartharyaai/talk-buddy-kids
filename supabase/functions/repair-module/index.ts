import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    console.log('🔧 Repair module called for low-quality transcription');
    
    const { transcript, childProfile, qualityIssue, confidence, durationMs, conversationContext } = await req.json();
    
    console.log(`🔍 Processing intelligent repair request:`, {
      transcript,
      issue: qualityIssue,
      confidence,
      duration: durationMs,
      contextLength: conversationContext?.length || 0
    });

    // WORLD-CLASS CONTEXT-AWARE CLARIFIER PROMPTS (≤10 words)
    const clarifierPrompts = {
      'too short': [
        "Can you say more?",
        "Tell me again, please?", 
        "What did you want to say?",
        "I'm listening - say that again?",
        "Can you try saying more words?",
        "What would you like to talk about?"
      ],
      'low confidence': [
        "Can you speak a bit louder?",
        "I didn't quite catch that. Try again?",
        "Can you say that more clearly?",
        "Speak up so I can hear you!",
        "Try talking closer to your device?",
        "Say that one more time?"
      ],
      'very short text': [
        "What did you say?",
        "Can you tell me more?",
        "I didn't hear you well. Again?",
        "Say that louder, please?",
        "What would you like to know?",
        "Tell me what's on your mind?"
      ],
      'only filler words': [
        "Take your time! What did you want to say?",
        "It's okay, try again when ready!",
        "Think about it and tell me!",
        "What's on your mind?",
        "No rush - what would you like to know?",
        "When you're ready, tell me!"
      ],
      'unintelligible audio': [
        "I can't hear you clearly. Try again?",
        "Move closer and speak up!",
        "Check your microphone and try again?",
        "Speak directly into your device!",
        "Can you try talking louder?",
        "Come closer so I can hear you!"
      ],
      'repeated patterns': [
        "I heard you! What did you mean?",
        "Okay! What would you like to know?",
        "Yes! Tell me more about that!",
        "Got it! What else?",
        "I understand! What's your question?",
        "Alright! What would you like to do?"
      ]
    };

    // Get age-appropriate response
    const getAgeAppropriateResponse = (prompts: string[], ageGroup: string) => {
      // For very young children (3-5), use simpler language
      if (ageGroup === '3-5') {
        const simplePrompts = prompts.filter(p => p.split(' ').length <= 6);
        return simplePrompts.length > 0 ? simplePrompts : prompts;
      }
      return prompts;
    };

    // CONTEXT-AWARE CLARIFIER SELECTION
    const getContextAwarePrompt = () => {
      // Check conversation context for patterns
      const recentFailures = conversationContext?.filter(msg => 
        msg.type === 'buddy' && (
          msg.content.includes("didn't understand") || 
          msg.content.includes("try again") ||
          msg.content.includes("didn't catch") ||
          msg.content.includes("speak")
        )
      )?.length || 0;

      // If multiple failures, suggest topic change
      if (recentFailures >= 2) {
        return [
          "Let's try something fun! What do you like?",
          "How about we talk about animals?",
          "Want to hear a story instead?",
          "What makes you happy?",
          "Tell me about your favorite toy!"
        ];
      }

      // Check for very short responses indicating possible confusion
      if (transcript && transcript.length <= 3 && confidence < 0.4) {
        return [
          "I want to hear you! Say something!",
          "What's on your mind today?",
          "Tell me what you're thinking!",
          "I'm all ears! What do you want?",
          "Share something exciting with me!"
        ];
      }

      // Default to quality-specific prompts
      return clarifierPrompts[qualityIssue] || clarifierPrompts['low confidence'];
    };

    const relevantPrompts = getContextAwarePrompt();
    const ageAppropriate = getAgeAppropriateResponse(relevantPrompts, childProfile?.ageGroup || '6-8');
    const selectedPrompt = ageAppropriate[Math.floor(Math.random() * ageAppropriate.length)];

    // Context-aware emoji selection
    const recentFailures = conversationContext?.filter(msg => 
      msg.type === 'buddy' && msg.content.includes("try again")
    )?.length || 0;
    
    const encouragingEmojis = recentFailures >= 2 
      ? ['🌟', '✨', '🎉', '🚀', '💫'] // More encouraging for repeated failures
      : ['😊', '🤗', '👂', '💫', '🌟', '✨']; // Standard encouraging
    
    const emoji = encouragingEmojis[Math.floor(Math.random() * encouragingEmojis.length)];
    
    const response = `${selectedPrompt} ${emoji}`;

    console.log(`✅ Generated context-aware repair response: "${response}" (failures: ${recentFailures})`);

    return new Response(
      JSON.stringify({ 
        response,
        type: 'clarifier',
        originalTranscript: transcript,
        qualityIssue 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Repair module error:', error);
    
    // Fallback clarifier if repair module fails
    const fallbackResponse = "I didn't understand. Can you try again? 😊";
    
    return new Response(
      JSON.stringify({ 
        response: fallbackResponse,
        type: 'clarifier',
        error: true 
      }),
      {
        status: 200, // Don't fail - always provide a response for children
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});