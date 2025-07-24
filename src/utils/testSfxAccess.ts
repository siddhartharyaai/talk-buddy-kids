// Test SFX storage access directly
import { supabase } from '@/integrations/supabase/client';

export const testSfxAccess = async () => {
  try {
    console.log('🧪 Testing SFX storage access...');
    
    // List files in sfx/ folder
    console.log('📁 Listing files in sfx/...');
    const { data: files, error: listError } = await supabase.storage
      .from('content')
      .list('sfx/');
    
    if (listError) {
      console.error('❌ SFX List error:', listError);
      return { error: `List error: ${listError.message}` };
    }
    
    console.log('📄 SFX Files found:', files);
    
    if (!files || files.length === 0) {
      return { error: 'No files found in sfx/ folder' };
    }
    
    // Try to download the test SFX
    const testFile = files.find(f => f.name === 'tiger-roar.json');
    if (!testFile) {
      return { error: 'tiger-roar.json not found in files list. Available files: ' + files.map(f => f.name).join(', ') };
    }
    
    console.log('📥 Downloading tiger-roar.json...');
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('content')
      .download('sfx/tiger-roar.json');
    
    if (downloadError) {
      console.error('❌ SFX Download error:', downloadError);
      return { error: `Download error: ${downloadError.message}` };
    }
    
    if (!fileData) {
      return { error: 'No file data returned' };
    }
    
    const text = await fileData.text();
    const sfx = JSON.parse(text);
    
    console.log('✅ SFX downloaded successfully:', sfx.name);
    return { success: true, sfx };
    
  } catch (err) {
    console.error('❌ SFX Storage test failed:', err);
    return { error: err?.message || String(err) };
  }
};