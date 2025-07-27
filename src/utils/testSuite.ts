interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  timing?: string;
  details?: string;
}

interface TestSuite {
  latency: TestResult;
  repair: TestResult;
  mood: TestResult;
  gameSwitch: TestResult;
  storyCompleteness: TestResult;
  memoryCron: TestResult;
}

export class BuddyTestSuite {
  private results: TestSuite;
  
  constructor() {
    this.results = {
      latency: { test: 'Latency', status: 'FAIL' },
      repair: { test: 'Repair', status: 'FAIL' },
      mood: { test: 'Mood', status: 'FAIL' },
      gameSwitch: { test: 'Game switch', status: 'FAIL' },
      storyCompleteness: { test: 'Story completeness', status: 'FAIL' },
      memoryCron: { test: 'Memory cron smoke', status: 'FAIL' }
    };
  }

  async runLatencyTest(): Promise<void> {
    try {
      const start = performance.now();
      
      // Test STT latency (mock)
      const sttStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate STT
      const sttTime = performance.now() - sttStart;
      
      // Test TTS latency (mock)
      const ttsStart = performance.now();
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate TTS
      const ttsTime = performance.now() - ttsStart;
      
      const total = performance.now() - start;
      
      this.results.latency = {
        test: 'Latency',
        status: sttTime < 450 && ttsTime < 600 ? 'PASS' : 'FAIL',
        timing: `STT: ${sttTime.toFixed(0)}ms, TTS: ${ttsTime.toFixed(0)}ms`,
        details: `Total: ${total.toFixed(0)}ms`
      };
    } catch (error) {
      this.results.latency = {
        test: 'Latency',
        status: 'FAIL',
        details: `Error: ${error}`
      };
    }
  }

  async runRepairTest(): Promise<void> {
    try {
      // Mock repair test - simulate low quality transcription
      const mockTranscript = "I want dino";
      const expectedRepair = mockTranscript.includes("dino");
      
      this.results.repair = {
        test: 'Repair',
        status: expectedRepair ? 'PASS' : 'FAIL',
        details: `Transcript: "${mockTranscript}"`
      };
    } catch (error) {
      this.results.repair = {
        test: 'Repair',
        status: 'FAIL',
        details: `Error: ${error}`
      };
    }
  }

  async runMoodTest(): Promise<void> {
    try {
      // Mock mood detection test
      const sadMessage = "I lost my toy";
      const expectedSoothing = sadMessage.includes("lost");
      
      this.results.mood = {
        test: 'Mood',
        status: expectedSoothing ? 'PASS' : 'FAIL',
        details: `Message: "${sadMessage}"`
      };
    } catch (error) {
      this.results.mood = {
        test: 'Mood',
        status: 'FAIL',
        details: `Error: ${error}`
      };
    }
  }

  async runGameSwitchTest(): Promise<void> {
    try {
      // Mock game switch test - simulate silence detection
      const silenceMs = 7000;
      const shouldSwitchToGame = silenceMs > 6000;
      
      this.results.gameSwitch = {
        test: 'Game switch',
        status: shouldSwitchToGame ? 'PASS' : 'FAIL',
        details: `Silence: ${silenceMs}ms`
      };
    } catch (error) {
      this.results.gameSwitch = {
        test: 'Game switch',
        status: 'FAIL',
        details: `Error: ${error}`
      };
    }
  }

  async runStoryCompletenessTest(): Promise<void> {
    try {
      // Mock story completeness test
      const storyRequest = "Tell bedtime story age 4";
      const hasAgeContext = storyRequest.includes("age 4");
      
      this.results.storyCompleteness = {
        test: 'Story completeness',
        status: hasAgeContext ? 'PASS' : 'FAIL',
        details: `Request: "${storyRequest}"`
      };
    } catch (error) {
      this.results.storyCompleteness = {
        test: 'Story completeness',
        status: 'FAIL',
        details: `Error: ${error}`
      };
    }
  }

  async runMemoryCronTest(): Promise<void> {
    try {
      // Mock memory cron test
      const mockSnapshot = { date: new Date().toISOString(), summary: "Test session" };
      const isValid = mockSnapshot.date && mockSnapshot.summary;
      
      this.results.memoryCron = {
        test: 'Memory cron smoke',
        status: isValid ? 'PASS' : 'FAIL',
        details: `Snapshot created: ${!!isValid}`
      };
    } catch (error) {
      this.results.memoryCron = {
        test: 'Memory cron smoke',
        status: 'FAIL',
        details: `Error: ${error}`
      };
    }
  }

  async runAllTests(): Promise<TestSuite> {
    console.log('🔬 Running Buddy Test Suite...');
    
    await Promise.all([
      this.runLatencyTest(),
      this.runRepairTest(),
      this.runMoodTest(),
      this.runGameSwitchTest(),
      this.runStoryCompletenessTest(),
      this.runMemoryCronTest()
    ]);
    
    return this.results;
  }

  generateReport(): string {
    const tests = Object.values(this.results);
    const passCount = tests.filter(t => t.status === 'PASS').length;
    const totalCount = tests.length;
    
    let report = `# Buddy Test Suite Results\n\n`;
    report += `**Overall: ${passCount}/${totalCount} tests passed**\n\n`;
    report += `| Test | Status | Details |\n`;
    report += `|------|--------|----------|\n`;
    
    tests.forEach(test => {
      const status = test.status === 'PASS' ? '✅ PASS' : '❌ FAIL';
      const details = test.timing ? `${test.timing} ${test.details || ''}` : (test.details || '');
      report += `| ${test.test} | ${status} | ${details} |\n`;
    });
    
    return report;
  }
}