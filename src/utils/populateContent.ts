import { supabase } from "@/integrations/supabase/client";

export const populateContentLibrary = async () => {
  console.log('🚀 Starting content library population...');
  
  try {
    // Call bulk-import function
    const { data, error } = await supabase.functions.invoke('bulk-import', {
      body: { 
        contentTypes: ['stories', 'rhymes'],
        languages: ['en', 'hi'],
        maxItems: 5,  // Start with 5 items per type
        dryRun: false 
      }
    });
    
    if (error) {
      console.error('❌ Bulk import failed:', error);
      throw error;
    }
    
    console.log('✅ Bulk import completed:', data);
    return data;
    
  } catch (err) {
    console.error('❌ Population error:', err);
    throw err;
  }
};

// Test function to verify content exists
export const verifyContent = async () => {
  try {
    // Check storage bucket
    const { data: files, error } = await supabase.storage
      .from('content')
      .list('', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });
      
    if (error) {
      console.error('❌ Failed to list files:', error);
      return { files: [], error };
    }
    
    console.log(`📁 Found ${files?.length || 0} files in content bucket:`);
    files?.forEach(file => console.log(`  - ${file.name} (${file.created_at})`));
    
    return { files, error: null };
    
  } catch (err) {
    console.error('❌ Verification error:', err);
    return { files: [], error: err };
  }
};