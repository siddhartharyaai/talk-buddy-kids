// Test storage access directly
import { supabase } from '@/integrations/supabase/client';

export const testStorageAccess = async () => {
  try {
    console.log('🧪 Testing storage access...');
    
    // First, list files in stories/en/ folder
    console.log('📁 Listing files in stories/en/...');
    const { data: files, error: listError } = await supabase.storage
      .from('content')
      .list('stories/en/');
    
    if (listError) {
      console.error('❌ List error:', listError);
      return { error: `List error: ${listError.message}` };
    }
    
    console.log('📄 Files found:', files);
    
    if (!files || files.length === 0) {
      return { error: 'No files found in stories/en/ folder' };
    }
    
    // Try to download the test story
    const testFile = files.find(f => f.name === 'test-animal-story.json');
    if (!testFile) {
      return { error: 'test-animal-story.json not found in files list' };
    }
    
    console.log('📥 Downloading test-animal-story.json...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('content')
      .download('stories/en/test-animal-story.json');
    
    if (downloadError) {
      console.error('❌ Download error:', downloadError);
      return { error: `Download error: ${downloadError.message}` };
    }
    
    if (!fileData) {
      return { error: 'No file data returned' };
    }
    
    const text = await fileData.text();
    const story = JSON.parse(text);
    
    console.log('✅ Story downloaded successfully:', story.title);
    return { success: true, story };
    
  } catch (err) {
    console.error('❌ Storage test failed:', err);
    return { error: err?.message || String(err) };
  }
};