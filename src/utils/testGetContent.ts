// Test get-content function directly
import { supabase } from '@/integrations/supabase/client';

export const testGetContent = async () => {
  try {
    console.log('🧪 Testing get-content function...');
    
    const { data, error } = await supabase.functions.invoke('get-content', {
      body: {
        type: 'story',
        language: 'en',
        age: 5,
        topic: 'animals'
      }
    });
    
    if (error) {
      console.error('❌ get-content error:', error);
      return { error };
    }
    
    console.log('✅ get-content result:', data);
    return data;
    
  } catch (err) {
    console.error('❌ get-content failed:', err);
    return { error: err.message };
  }
};