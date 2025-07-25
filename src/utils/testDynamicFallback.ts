import { supabase } from '@/integrations/supabase/client';

export interface FallbackTestResult {
  testName: string;
  passed: boolean;
  result?: any;
  error?: string;
  responseTime?: number;
}

export const runDynamicFallbackTests = async () => {
  console.log('🧪 Starting Dynamic Fallback Tests...');
  
  const results: FallbackTestResult[] = [];
  
  // Test 1: Unseen Story
  console.log('\n🔬 Test 1: Unseen Story - "dinosaurs playing basketball"');
  const test1Start = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke('get-content', {
      body: {
        type: 'story',
        language: 'en',
        age: 6,
        topic: 'dinosaurs playing basketball'
      }
    });
    
    const responseTime = Date.now() - test1Start;
    
    if (error) {
      results.push({
        testName: 'Unseen Story',
        passed: false,
        error: String(error),
        responseTime
      });
    } else if (data?.content) {
      const isGenerated = data.content.source === 'generated' || data.content.isAiGenerated;
      results.push({
        testName: 'Unseen Story',
        passed: true,
        result: {
          title: data.content.title,
          source: data.content.source,
          isAiGenerated: isGenerated,
          hasScenes: data.content.scenes?.length > 0
        },
        responseTime
      });
      console.log(`✅ Story received: "${data.content.title}" (source: ${data.content.source})`);
    } else {
      results.push({
        testName: 'Unseen Story',
        passed: false,
        error: 'No content returned',
        responseTime
      });
    }
  } catch (err) {
    results.push({
      testName: 'Unseen Story',
      passed: false,
      error: String(err),
      responseTime: Date.now() - test1Start
    });
  }

  // Test 2: Unseen Rhyme  
  console.log('\n🔬 Test 2: Unseen Rhyme - "rainbows and kittens"');
  const test2Start = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke('get-content', {
      body: {
        type: 'rhyme',
        language: 'en',
        age: 5,
        topic: 'rainbows and kittens'
      }
    });
    
    const responseTime = Date.now() - test2Start;
    
    if (error) {
      results.push({
        testName: 'Unseen Rhyme',
        passed: false,
        error: String(error),
        responseTime
      });
    } else if (data?.content) {
      const isGenerated = data.content.source === 'generated' || data.content.isAiGenerated;
      results.push({
        testName: 'Unseen Rhyme',
        passed: true,
        result: {
          title: data.content.title,
          source: data.content.source,
          isAiGenerated: isGenerated,
          hasLyrics: !!data.content.lyrics
        },
        responseTime
      });
      console.log(`✅ Rhyme received: "${data.content.title}" (source: ${data.content.source})`);
    } else {
      results.push({
        testName: 'Unseen Rhyme',
        passed: false,
        error: 'No content returned',
        responseTime
      });
    }
  } catch (err) {
    results.push({
      testName: 'Unseen Rhyme',
      passed: false,
      error: String(err),
      responseTime: Date.now() - test2Start
    });
  }

  // Test 3: General Q&A
  console.log('\n🔬 Test 3: General Q&A - "Why do leaves fall?"');
  const test3Start = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke('ask-gemini', {
      body: {
        message: 'Why do leaves fall?',
        childProfile: {
          name: 'TestChild',
          ageYears: 6,
          interests: ['nature'],
          language: ['english']
        }
      }
    });
    
    const responseTime = Date.now() - test3Start;
    
    if (error) {
      results.push({
        testName: 'General Q&A',
        passed: false,
        error: String(error),
        responseTime
      });
    } else if (data?.reply) {
      const wordCount = data.reply.split(' ').length;
      results.push({
        testName: 'General Q&A',
        passed: wordCount <= 40, // Should be concise
        result: {
          reply: data.reply,
          wordCount,
          isFactual: true
        },
        responseTime
      });
      console.log(`✅ Q&A response: "${data.reply.substring(0, 50)}..." (${wordCount} words)`);
    } else {
      results.push({
        testName: 'General Q&A',
        passed: false,
        error: 'No reply returned',
        responseTime
      });
    }
  } catch (err) {
    results.push({
      testName: 'General Q&A',
      passed: false,
      error: String(err),
      responseTime: Date.now() - test3Start
    });
  }

  // Test 4: Emotional Support
  console.log('\n🔬 Test 4: Emotional Support - "I\'m sad"');
  const test4Start = Date.now();
  try {
    const { data, error } = await supabase.functions.invoke('ask-gemini', {
      body: {
        message: "I'm sad",
        childProfile: {
          name: 'TestChild',
          ageYears: 6,
          interests: ['animals'],
          language: ['english']
        }
      }
    });
    
    const responseTime = Date.now() - test4Start;
    
    if (error) {
      results.push({
        testName: 'Emotional Support',
        passed: false,
        error: String(error),
        responseTime
      });
    } else if (data?.reply) {
      const isEmpathetic = /sorry|sad|feel|understand|here for you|talk to.*grown/i.test(data.reply);
      const sentenceCount = data.reply.split(/[.!?]+/).filter(s => s.trim()).length;
      
      results.push({
        testName: 'Emotional Support',
        passed: isEmpathetic && sentenceCount <= 3, // Should be empathetic and brief
        result: {
          reply: data.reply,
          isEmpathetic,
          sentenceCount,
          mentionsGrownUp: /grown.*up|adult|parent|mommy|daddy/i.test(data.reply)
        },
        responseTime
      });
      console.log(`✅ Emotional response: "${data.reply.substring(0, 50)}..." (empathetic: ${isEmpathetic})`);
    } else {
      results.push({
        testName: 'Emotional Support',
        passed: false,
        error: 'No reply returned',
        responseTime
      });
    }
  } catch (err) {
    results.push({
      testName: 'Emotional Support',
      passed: false,
      error: String(err),
      responseTime: Date.now() - test4Start
    });
  }

  console.log('\n🏁 Dynamic Fallback Tests Complete');
  return results;
};

export const generateTestReport = (results: FallbackTestResult[]) => {
  console.log('\n📊 DYNAMIC FALLBACK TEST REPORT');
  console.log('=' .repeat(50));
  
  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const time = result.responseTime ? `${result.responseTime}ms` : 'N/A';
    
    console.log(`${index + 1}. ${result.testName}: ${status} (${time})`);
    
    if (!result.passed && result.error) {
      console.log(`   Error: ${result.error}`);
    }
    
    if (result.result) {
      console.log(`   Result: ${JSON.stringify(result.result, null, 2)}`);
    }
    console.log('');
  });
  
  const passCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`Overall: ${passCount}/${totalCount} tests passed`);
  console.log('=' .repeat(50));
  
  return {
    passCount,
    totalCount,
    allPassed: passCount === totalCount,
    results
  };
};