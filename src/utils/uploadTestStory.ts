// Upload test story via client-side code
import { supabase } from '@/integrations/supabase/client';

const uploadTestStory = async () => {
  const testStory = {
    "id": "test-animal-story",
    "title": "The Brave Little Elephant",
    "author": "Test Story", 
    "language": "en",
    "ageBand": "3-5",
    "tags": ["animals", "elephant", "brave", "forest"],
    "body": "Once upon a time, in a big green forest, there lived a little elephant named Ellie. Ellie was smaller than all the other elephants, but she had the biggest heart in the whole forest! 🐘 One sunny day, Ellie heard a tiny voice calling for help. It was a little bird who had fallen from its nest high up in a tree. All the other animals were too big to help, but Ellie had an idea! She used her long trunk to gently lift the little bird back to its nest. The bird was so happy and chirped a beautiful thank you song. From that day on, Ellie learned that being small didn't matter - what mattered was being kind and helpful. All the forest animals became Ellie's best friends, and she was known as the bravest little elephant in the whole forest! 🌟",
    "scenes": [
      "Once upon a time, in a big green forest, there lived a little elephant named Ellie. Ellie was smaller than all the other elephants, but she had the biggest heart in the whole forest! 🐘",
      "One sunny day, Ellie heard a tiny voice calling for help. It was a little bird who had fallen from its nest high up in a tree. All the other animals were too big to help, but Ellie had an idea!",
      "She used her long trunk to gently lift the little bird back to its nest. The bird was so happy and chirped a beautiful thank you song. From that day on, Ellie learned that being small didn't matter - what mattered was being kind and helpful. All the forest animals became Ellie's best friends, and she was known as the bravest little elephant in the whole forest! 🌟"
    ]
  };

  try {
    // First, try to remove any existing file
    const { error: deleteError } = await supabase.storage
      .from('content')
      .remove(['stories/en/test-animal-story.json']);
    
    if (deleteError) {
      console.log('No existing file to delete (this is fine):', deleteError.message);
    }

    // Create a proper blob with the JSON content
    const blob = new Blob([JSON.stringify(testStory, null, 2)], { 
      type: 'application/json' 
    });

    // Upload with proper options
    const { data, error } = await supabase.storage
      .from('content')
      .upload('stories/en/test-animal-story.json', blob, {
        cacheControl: '3600',
        upsert: true
      });

    if (error) {
      console.error('❌ Upload error:', error);
      throw new Error(error.message || String(error));
    } 
    
    console.log('✅ Test story uploaded:', data);
    
    // Verify the upload by trying to download it immediately
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from('content')
      .download('stories/en/test-animal-story.json');
    
    if (downloadError) {
      throw new Error(`Upload succeeded but verification failed: ${downloadError.message}`);
    }
    
    const verifyText = await downloadData.text();
    const verifyStory = JSON.parse(verifyText);
    console.log('✅ Upload verified:', verifyStory.title);
    
    return data;
  } catch (err) {
    console.error('❌ Upload failed:', err);
    throw new Error(err?.message || String(err));
  }
};

export { uploadTestStory };