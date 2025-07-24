// Upload test SFX for tiger roar
import { supabase } from '@/integrations/supabase/client';

export const uploadTestSfx = async () => {
  const testSfx = {
    "id": "test-tiger-roar",
    "name": "Tiger Roar",
    "type": "sfx",
    "tags": ["tiger", "roar", "animal", "wild"],
    "description": "A powerful tiger roar sound effect",
    "duration": 3.2,
    "format": "mp3"
  };

  try {
    // First, try to remove any existing file
    const { error: deleteError } = await supabase.storage
      .from('content')
      .remove(['sfx/tiger-roar.json']);
    
    if (deleteError) {
      console.log('No existing SFX file to delete (this is fine):', deleteError.message);
    }

    // Create a proper blob with the JSON content
    const blob = new Blob([JSON.stringify(testSfx, null, 2)], { 
      type: 'application/json' 
    });

    // Upload with proper options
    const { data, error } = await supabase.storage
      .from('content')
      .upload('sfx/tiger-roar.json', blob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('❌ SFX Upload error:', error);
      throw new Error(error.message || String(error));
    } 
    
    console.log('✅ Test SFX uploaded:', data);
    
    // Verify the upload by trying to download it immediately
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('content')
      .download('sfx/tiger-roar.json');
    
    if (downloadError) {
      throw new Error(`SFX upload succeeded but verification failed: ${downloadError.message}`);
    }
    
    const verifyText = await downloadData.text();
    const verifySfx = JSON.parse(verifyText);
    console.log('✅ SFX upload verified:', verifySfx.name);
    
    return data;
  } catch (err) {
    console.error('❌ SFX Upload failed:', err);
    throw new Error(err?.message || String(err));
  }
};