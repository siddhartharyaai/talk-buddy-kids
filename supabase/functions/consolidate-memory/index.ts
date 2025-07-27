import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🧠 Memory consolidation cron started');
    
    // Get all child profiles
    const { data: profiles, error } = await supabase
      .from('child_profiles')
      .select('user_id, name, age_years, extended_memory');
    
    if (error) {
      console.error('❌ Error fetching profiles:', error);
      return new Response(JSON.stringify({ error: error.message }), { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let processedCount = 0;
    
    for (const profile of profiles || []) {
      try {
        const memory = profile.extended_memory || {};
        const recentTopics = memory.recentTopics || [];
        const favouriteTopics = memory.favouriteTopics || {};
        
        if (recentTopics.length === 0) continue;
        
        // Create memory snapshot using Gemini
        const summaryPrompt = `Summarize this child's learning session in 1-2 sentences:
Name: ${profile.name}, Age: ${profile.age_years}
Recent topics: ${recentTopics.join(', ')}
Favorite topics: ${Object.entries(favouriteTopics).slice(0, 3).map(([t, c]) => `${t}(${c})`).join(', ')}

Return JSON: {"summary": "brief summary", "keyInterests": ["interest1", "interest2"]}`;

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + geminiApiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: summaryPrompt }] }],
            generationConfig: { maxOutputTokens: 100 }
          })
        });

        const data = await response.json();
        const summaryText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const summary = JSON.parse(summaryText.replace(/```json|```/g, ''));
        
        // Update memory with snapshot
        const updatedMemory = {
          ...memory,
          memorySnapshot: {
            date: new Date().toISOString(),
            summary: summary.summary || 'Learning session completed',
            keyInterests: summary.keyInterests || recentTopics.slice(0, 2)
          },
          lastConsolidation: new Date().toISOString()
        };
        
        await supabase
          .from('child_profiles')
          .update({ extended_memory: updatedMemory })
          .eq('user_id', profile.user_id);
          
        processedCount++;
        console.log(`✅ Consolidated memory for ${profile.name}`);
        
      } catch (profileError) {
        console.error(`❌ Error processing profile ${profile.name}:`, profileError);
      }
    }
    
    console.log(`🎯 Memory consolidation complete: ${processedCount} profiles processed`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      processedCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('❌ Memory consolidation error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});