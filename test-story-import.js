// Quick test to see what happened with story import
console.log('Testing story import...');

import { supabase } from '@/integrations/supabase/client';

// Test individual story import
const testStoryImport = async () => {
  try {
    console.log('🧪 Testing import-storyweaver function...');
    
    const { data, error } = await supabase.functions.invoke('import-storyweaver', {
      body: { storyId: 31095 } // Simple test with one story ID
    });
    
    if (error) {
      console.error('❌ Story import error:', error);
      return;
    }
    
    console.log('✅ Story import result:', data);
    
  } catch (err) {
    console.error('❌ Story import failed:', err);
  }
};

testStoryImport();