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
    console.log('📝 Noun extraction function called');
    
    const { text } = await req.json();
    
    if (!text) {
      throw new Error('No text provided for noun extraction');
    }

    console.log(`🔍 Extracting nouns from: "${text}"`);

    // Enhanced noun extraction for children's topics
    const extractNouns = (inputText: string): string[] => {
      const text = inputText.toLowerCase();
      
      // Common children's topics and interests (educational focus)
      const topicPatterns = {
        // Animals
        animals: /\b(animal|animals|dog|cat|bird|fish|lion|tiger|elephant|giraffe|zebra|monkey|bear|rabbit|mouse|horse|cow|pig|sheep|chicken|duck|frog|snake|spider|butterfly|bee|ant|dinosaur|dinosaurs|t-rex|triceratops|stegosaurus|pterodactyl)\b/g,
        
        // Science & Nature
        science: /\b(science|experiment|nature|plant|plants|tree|trees|flower|flowers|leaf|leaves|sun|moon|star|stars|planet|planets|earth|sky|cloud|clouds|rain|snow|weather|ocean|sea|river|mountain|rock|rocks)\b/g,
        
        // Colors & Art
        colors: /\b(color|colors|red|blue|green|yellow|orange|purple|pink|black|white|brown|art|painting|drawing|crayon|crayons)\b/g,
        
        // Numbers & Math
        math: /\b(number|numbers|count|counting|math|mathematics|add|adding|subtract|subtracting|plus|minus|equals|one|two|three|four|five|six|seven|eight|nine|ten)\b/g,
        
        // Transportation
        transport: /\b(car|cars|truck|trucks|bus|train|airplane|plane|boat|ship|bicycle|bike|motorcycle)\b/g,
        
        // Food
        food: /\b(food|eat|eating|apple|banana|orange|pizza|cake|cookie|cookies|milk|water|juice|bread|sandwich)\b/g,
        
        // Body & Health
        body: /\b(body|head|eye|eyes|nose|mouth|hand|hands|foot|feet|arm|arms|leg|legs|hair|tooth|teeth|healthy|exercise)\b/g,
        
        // Family & People
        family: /\b(family|mom|dad|mother|father|sister|brother|grandma|grandpa|friend|friends|people|person|baby|babies)\b/g,
        
        // Activities & Games
        activities: /\b(play|playing|game|games|toy|toys|ball|puzzle|book|books|read|reading|sing|singing|dance|dancing|run|running|jump|jumping)\b/g,
        
        // Places
        places: /\b(home|house|school|park|library|store|beach|zoo|museum|playground|room|kitchen|bedroom|bathroom)\b/g,
        
        // Time & Seasons
        time: /\b(time|day|night|morning|afternoon|evening|today|tomorrow|yesterday|week|month|year|spring|summer|fall|autumn|winter|birthday|holiday)\b/g,
        
        // Feelings & Emotions
        emotions: /\b(happy|sad|excited|scared|angry|funny|love|like|good|bad|big|small|hot|cold|fast|slow)\b/g
      };

      const extractedTopics = new Set<string>();
      
      // Extract topics using patterns
      for (const [category, pattern] of Object.entries(topicPatterns)) {
        const matches = text.match(pattern);
        if (matches) {
          matches.forEach(match => {
            // Normalize and add to set
            const topic = match.trim().toLowerCase();
            if (topic.length > 2) { // Only meaningful words
              extractedTopics.add(topic);
            }
          });
        }
      }

      // Also extract standalone nouns (basic approach)
      const words = text.split(/\s+/);
      const commonNouns = words.filter(word => {
        const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
        return cleanWord.length > 3 && 
               !['this', 'that', 'what', 'when', 'where', 'with', 'have', 'will', 'they', 'them', 'from', 'been', 'were', 'said', 'each', 'which', 'their', 'would', 'there', 'could', 'other'].includes(cleanWord);
      });

      commonNouns.forEach(noun => extractedTopics.add(noun.toLowerCase()));

      return Array.from(extractedTopics).slice(0, 10); // Limit to top 10
    };

    const extractedNouns = extractNouns(text);
    
    console.log(`✅ Extracted ${extractedNouns.length} nouns:`, extractedNouns);

    return new Response(
      JSON.stringify({ 
        nouns: extractedNouns,
        originalText: text.slice(0, 100) // For debugging
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('❌ Noun extraction error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        nouns: [] // Return empty array as fallback
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});