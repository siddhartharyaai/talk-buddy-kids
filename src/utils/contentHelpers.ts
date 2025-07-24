import { supabase } from '@/integrations/supabase/client';

// Sample stories for initial content
export const sampleStories = {
  en: [
    {
      id: 'en_001',
      title: 'The Curious Elephant',
      language: 'en',
      ageBand: '5-7',
      body: 'Once upon a time, there was a young elephant named Ellie who loved to explore. Every morning, she would wake up and ask her mother, "What adventure will we have today?" One sunny day, Ellie discovered a beautiful butterfly sitting on a flower. The butterfly had wings like rainbows! "Hello little butterfly," said Ellie gently. "You are so colorful!" The butterfly danced around Ellie\'s trunk and they became the best of friends.',
      author: 'Buddy AI',
      tags: ['animals', 'friendship', 'nature'],
      readingLevel: 2,
      createdAt: new Date().toISOString(),
      source: 'buddy-ai'
    }
  ],
  hi: [
    {
      id: 'hi_001', 
      title: 'चतुर चूहा',
      language: 'hi',
      ageBand: '5-7',
      body: 'एक बार की बात है, एक छोटा सा चूहा था जिसका नाम चिंकू था। चिंकू बहुत चतुर था और हमेशा नई चीजें सीखना चाहता था। एक दिन उसने देखा कि बिल्ली रसोई में सो रही है। चिंकू ने सोचा, "अगर मैं चुपचाप जाऊं तो मुझे पनीर मिल सकता है।" वह दबे पांव रसोई में गया और स्वादिष्ट पनीर खाकर खुशी से वापस अपने घर आ गया।',
      author: 'Buddy AI',
      tags: ['animals', 'clever', 'food'],
      readingLevel: 2,
      createdAt: new Date().toISOString(),
      source: 'buddy-ai'
    }
  ]
};

// Sample nursery rhymes
export const sampleRhymes = {
  en: [
    {
      id: 'rhyme_en_001',
      title: 'Twinkle Twinkle Little Star',
      language: 'en',
      lyrics: [
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!',
        'Up above the world so high,',
        'Like a diamond in the sky.',
        'Twinkle, twinkle, little star,',
        'How I wonder what you are!'
      ],
      ageBand: '3-5',
      tags: ['stars', 'space', 'classic'],
      source: 'public-domain'
    }
  ],
  hi: [
    {
      id: 'rhyme_hi_001',
      title: 'चंदा मामा',
      language: 'hi',
      lyrics: [
        'चंदा मामा दूर के,',
        'पुए पकाए बूर के।',
        'आप खाएं थाली में,',
        'मुन्ने को दे प्याली में।',
        'प्याली गई टूट,',
        'मुन्ना गया रूठ।'
      ],
      ageBand: '3-5',
      tags: ['moon', 'food', 'classic'],
      source: 'traditional'
    }
  ]
};

// Helper to upload initial content to Supabase Storage
export const uploadInitialContent = async () => {
  try {
    console.log('🚀 Uploading initial content to storage...');
    
    // Upload stories
    for (const [lang, stories] of Object.entries(sampleStories)) {
      for (const story of stories) {
        const fileName = `stories/${lang}/${story.id}-${story.title.toLowerCase().replace(/\s+/g, '-')}.json`;
        const storyBlob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' });
        
        const { error } = await supabase.storage
          .from('content')
          .upload(fileName, storyBlob, { upsert: true });
          
        if (error) {
          console.error(`Error uploading story ${story.id}:`, error);
        } else {
          console.log(`✅ Uploaded story: ${story.title}`);
        }
      }
    }
    
    // Upload rhymes
    for (const [lang, rhymes] of Object.entries(sampleRhymes)) {
      for (const rhyme of rhymes) {
        const fileName = `rhymes/${lang}/${rhyme.id}-${rhyme.title.toLowerCase().replace(/\s+/g, '-')}.json`;
        const rhymeBlob = new Blob([JSON.stringify(rhyme, null, 2)], { type: 'application/json' });
        
        const { error } = await supabase.storage
          .from('content')
          .upload(fileName, rhymeBlob, { upsert: true });
          
        if (error) {
          console.error(`Error uploading rhyme ${rhyme.id}:`, error);
        } else {
          console.log(`✅ Uploaded rhyme: ${rhyme.title}`);
        }
      }
    }
    
    console.log('🎉 Initial content upload complete!');
    return true;
    
  } catch (error) {
    console.error('❌ Failed to upload initial content:', error);
    return false;
  }
};

// Helper to get SFX content (for now returns placeholder URLs)
export const getSfxHelper = (name: string): string => {
  // Placeholder SFX URLs - in production these would be actual files
  const sfxMap: Record<string, string> = {
    'tiger_roar': 'https://www.soundjay.com/misc/sounds/tiger-roar.mp3',
    'dog_bark': 'https://www.soundjay.com/misc/sounds/dog-bark.mp3', 
    'cat_meow': 'https://www.soundjay.com/misc/sounds/cat-meow.mp3',
    'cow_moo': 'https://www.soundjay.com/misc/sounds/cow-moo.mp3'
  };
  
  return sfxMap[name] || sfxMap['tiger_roar'];
};

// Test content switchboard functionality
export const testContentSwitchboard = async () => {
  console.log('🧪 Testing content switchboard...');
  
  const tests = [
    { type: 'story', lang: 'en', age: 6, topic: 'animals' },
    { type: 'rhyme', lang: 'hi', age: 4, topic: 'any' },
    { type: 'sfx', lang: 'en', age: 5, topic: 'animals' }
  ];
  
  for (const test of tests) {
    try {
      const { data, error } = await supabase.functions.invoke('get-content', {
        body: test
      });
      
      if (error) {
        console.error(`❌ Test failed for ${test.type}:`, error);
      } else {
        console.log(`✅ ${test.type} test passed:`, data.content?.title || data.content?.name);
      }
    } catch (error) {
      console.error(`❌ Test error for ${test.type}:`, error);
    }
  }
};