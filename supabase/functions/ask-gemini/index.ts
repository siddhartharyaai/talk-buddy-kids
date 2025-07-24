import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChildProfile {
  name: string;
  ageGroup: '3-5' | '6-8' | '9-12';
  ageYears: number;
  gender: 'boy' | 'girl' | 'non-binary' | 'other';
  interests: string[];
  learningGoals: string[];
  energyLevel: 'low' | 'medium' | 'high';
  language: ('english' | 'hindi')[];
}

interface LearningMemory {
  sessions: number;
  favouriteTopics: string[];
  recentTopics: string;
  preferredSentenceLen: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, childProfile, learningMemory } = await req.json() as {
      message: string;
      childProfile: ChildProfile;
      learningMemory?: LearningMemory;
    };

    console.log('🤖 Received request:', { message, childProfile, learningMemory });

    if (!message) {
      throw new Error('Message is required');
    }

    if (!childProfile) {
      throw new Error('Child profile is required');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // 1. ADAPTIVE REPLY ENGINE - Intent Classifier
    function classifyIntent(text: string) {
      if (/story|कहानी|kahani|tale|once upon/i.test(text)) return "story";
      if (/song|गाना|कविता|rhyme|sing|music/i.test(text)) return "song";
      if (/why|how|what|क्यों|क्या|explain|tell me about|what is/i.test(text)) return "question";
      return "chat";
    }

    // Classify user intent
    const intent = classifyIntent(message);
    console.log(`🎯 Intent classified: "${intent}" for message: "${message}"`);

    // Generate safe fallback topics based on interests
    const safeTopics = childProfile.interests.length > 0 
      ? childProfile.interests.slice(0, 2).join(' or ')
      : 'animals or nature';

    // Build enhanced system prompt with Step 8 learning memory
    const memoryContext = learningMemory ? `
LEARNING MEMORY
Sessions: ${learningMemory.sessions}
Favorite topics: ${learningMemory.favouriteTopics.join(', ') || 'discovering'}
Recent chats: ${learningMemory.recentTopics || 'just starting our conversation'}
Preferred length: ~${learningMemory.preferredSentenceLen} words
` : '';

    const systemPrompt = `You are "Buddy", a cheerful AI friend.

CHILD PROFILE
Name: ${childProfile.name}
Age: ${childProfile.ageYears} yrs (${childProfile.ageGroup})
Lang: ${childProfile.language.join(', ')}
Likes: ${childProfile.interests.join(', ') || 'exploring new things'}
Goals: ${childProfile.learningGoals.join(', ') || 'having fun learning'}
Energy: ${childProfile.energyLevel}
${memoryContext}
CONVERSATION RULES
- ONLY say "Hi ${childProfile.name}!" for the FIRST message in a session
- For ongoing conversation, respond naturally WITHOUT name greetings
- If sessions > 0, this is a continuing conversation - NO greetings needed
- Focus on the content, not repetitive introductions

INTENT: ${intent}
LENGTH GUIDE
• "question" → concise answer ≤ 40 words.
• "story" → 250-350 words with beginning–middle–end.
• "song" → 8-12 lines, rhyming if possible.
• "chat" → 1-2 friendly sentences.
Follow the guide exactly.

STYLE & EMOJIS
${childProfile.ageGroup === '3-5' ? 'Simple language with 🐰🦖🦋 emojis.' : ''}${childProfile.ageGroup === '6-8' ? 'Clear explanations with 😀🙌🤩 emojis.' : ''}${childProfile.ageGroup === '9-12' ? 'Detailed responses with 🤓🚀 emojis.' : ''}

PERSONALIZATION
${learningMemory?.favouriteTopics.length ? `Focus on: ${learningMemory.favouriteTopics.slice(0, 3).join(', ')}` : 'Explore their interests'}
${learningMemory?.recentTopics ? `Recent context: ${learningMemory.recentTopics.substring(0, 100)}...` : ''}

SAFETY
No politics, brands, personal data.
If unsafe asked → "Let's talk about ${safeTopics}!" 😊

Current message: "${message}"
Sessions count: ${learningMemory?.sessions || 0} (${learningMemory?.sessions === 0 ? 'First time - OK to greet' : 'Ongoing - NO greeting needed'})

Respond naturally as Buddy!`;

    console.log('🚀 Calling Gemini API...');

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': geminiApiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: systemPrompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: (() => {
              // 3. Dynamic token limits based on intent
              const maxTokens = intent === "story" ? 1500
                              : intent === "song" ? 800
                              : intent === "question" ? 300
                              : 300; // chat
              
              console.log(`🔢 Setting maxTokens to ${maxTokens} for intent: ${intent}`);
              return maxTokens;
            })(),
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('❌ Gemini API error:', response.status, errorData);
      throw new Error(`Gemini API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();
    console.log('📝 Gemini response:', data);

    // Extract the response text
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!aiResponse) {
      console.error('❌ No response from Gemini:', data);
      throw new Error('No response generated by Gemini');
    }

    // Parse JSON response
    let buddyText = '';
    let keywords: string[] = [];
    
    try {
      const parsed = JSON.parse(aiResponse.trim());
      buddyText = parsed.buddyText || aiResponse;
      keywords = parsed.keywords || [];
    } catch (e) {
      // If not valid JSON, use response as-is
      buddyText = aiResponse.trim();
      keywords = [];
    }

    console.log('✅ Generated response:', buddyText);

    // Generate sample replies for each age group (Step 2 requirement)
    const sampleReplies = {
      '3-5': [
        "Hi! 🐰 Fun day? What made you smile?",
        "Wow! 🦋 Tell me about your favorite color!"
      ],
      '6-8': [
        "Hey there! 😀 What's the coolest thing you learned today?",
        "Amazing! 🌈 Can you tell me about something that surprised you?"
      ],
      '9-12': [
        "Hello! 🤓 I'm curious about what's been on your mind lately. What fascinating topic have you been thinking about?",
        "Great to see you! 🚀 What's a challenge you're working on that excites you?"
      ]
    };
    
    console.log('📋 Sample replies by age group:', sampleReplies);

    return new Response(JSON.stringify({ 
      response: buddyText,
      keywords: keywords,
      usage: data.usageMetadata || null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Error in ask-gemini function:', error);
    
    // Return a friendly fallback response
    const fallbackResponse = "Hi there! I'm having a little trouble right now, but I'm still here to chat! Can you ask me something else? 😊";
    
    return new Response(JSON.stringify({ 
      response: fallbackResponse,
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});