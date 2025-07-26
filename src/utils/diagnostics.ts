// Comprehensive diagnostics and health checks for Buddy AI
import { supabase } from '@/integrations/supabase/client';

export interface DiagnosticResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
  timing?: number;
}

export class BuddyDiagnostics {
  static async runFullDiagnostic(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    console.log('🏥 Starting comprehensive Buddy AI diagnostics...');
    
    // 1. Environment Tests
    results.push(...await this.testEnvironment());
    
    // 2. Authentication Tests  
    results.push(...await this.testAuthentication());
    
    // 3. Database Tests
    results.push(...await this.testDatabase());
    
    // 4. Edge Function Tests
    results.push(...await this.testEdgeFunctions());
    
    // 5. Audio System Tests
    results.push(...await this.testAudioSystems());
    
    // 6. Mobile Compatibility Tests
    results.push(...await this.testMobileCompatibility());
    
    return results;
  }
  
  private static async testEnvironment(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    // Browser compatibility
    results.push({
      category: 'Environment',
      test: 'Browser Support',
      status: this.checkBrowserSupport() ? 'PASS' : 'FAIL',
      message: `User Agent: ${navigator.userAgent.substring(0, 50)}...`
    });
    
    // Network connectivity
    results.push({
      category: 'Environment', 
      test: 'Network Status',
      status: navigator.onLine ? 'PASS' : 'FAIL',
      message: navigator.onLine ? 'Online' : 'Offline'
    });
    
    // WebSocket support
    results.push({
      category: 'Environment',
      test: 'WebSocket Support', 
      status: typeof WebSocket !== 'undefined' ? 'PASS' : 'FAIL',
      message: typeof WebSocket !== 'undefined' ? 'WebSocket available' : 'WebSocket not supported'
    });
    
    return results;
  }
  
  private static async testAuthentication(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    const startTime = Date.now();
    
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      const timing = Date.now() - startTime;
      
      if (error) {
        results.push({
          category: 'Authentication',
          test: 'User Session',
          status: 'FAIL',
          message: `Auth error: ${error.message}`,
          timing
        });
      } else if (user) {
        results.push({
          category: 'Authentication', 
          test: 'User Session',
          status: 'PASS',
          message: `Authenticated as: ${user.email}`,
          timing
        });
      } else {
        results.push({
          category: 'Authentication',
          test: 'User Session', 
          status: 'WARN',
          message: 'No authenticated user',
          timing
        });
      }
    } catch (error) {
      results.push({
        category: 'Authentication',
        test: 'User Session',
        status: 'FAIL', 
        message: `Exception: ${error}`,
        timing: Date.now() - startTime
      });
    }
    
    return results;
  }
  
  private static async testDatabase(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    // Test child profiles table
    const startTime = Date.now();
    try {
      const { data, error } = await supabase
        .from('child_profiles')
        .select('id, name')
        .limit(1);
        
      const timing = Date.now() - startTime;
      
      if (error) {
        results.push({
          category: 'Database',
          test: 'Child Profiles Table',
          status: 'FAIL',
          message: `Query failed: ${error.message}`,
          timing
        });
      } else {
        results.push({
          category: 'Database',
          test: 'Child Profiles Table', 
          status: 'PASS',
          message: `Query successful. Found ${data?.length || 0} profiles`,
          timing
        });
      }
    } catch (error) {
      results.push({
        category: 'Database',
        test: 'Child Profiles Table',
        status: 'FAIL',
        message: `Exception: ${error}`,
        timing: Date.now() - startTime
      });
    }
    
    return results;
  }
  
  private static async testEdgeFunctions(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    // Test ask-gemini function
    const startTime = Date.now();
    try {
      const { data, error } = await supabase.functions.invoke('ask-gemini', {
        body: {
          message: 'Test message',
          childProfile: {
            name: 'TestChild',
            ageYears: 6,
            interests: ['test'],
            language: ['english']
          }
        }
      });
      
      const timing = Date.now() - startTime;
      
      if (error) {
        results.push({
          category: 'Edge Functions',
          test: 'ask-gemini',
          status: 'FAIL',
          message: `Function error: ${error.message}`,
          timing
        });
      } else {
        results.push({
          category: 'Edge Functions',
          test: 'ask-gemini',
          status: data?.response ? 'PASS' : 'WARN',
          message: data?.response ? 'Function responded successfully' : 'Function called but no response',
          timing
        });
      }
    } catch (error) {
      results.push({
        category: 'Edge Functions',
        test: 'ask-gemini',
        status: 'FAIL',
        message: `Exception: ${error}`,
        timing: Date.now() - startTime
      });
    }
    
    return results;
  }
  
  private static async testAudioSystems(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    // Test Audio API
    results.push({
      category: 'Audio',
      test: 'HTML5 Audio Support',
      status: typeof Audio !== 'undefined' ? 'PASS' : 'FAIL',
      message: typeof Audio !== 'undefined' ? 'Audio constructor available' : 'Audio not supported'
    });
    
    // Test AudioContext
    const hasAudioContext = !!(window.AudioContext || (window as any).webkitAudioContext);
    results.push({
      category: 'Audio',
      test: 'Web Audio API',
      status: hasAudioContext ? 'PASS' : 'WARN',
      message: hasAudioContext ? 'AudioContext available' : 'AudioContext not available'
    });
    
    // Test MediaRecorder
    results.push({
      category: 'Audio',
      test: 'MediaRecorder Support',
      status: typeof MediaRecorder !== 'undefined' ? 'PASS' : 'FAIL',
      message: typeof MediaRecorder !== 'undefined' ? 'MediaRecorder available' : 'MediaRecorder not supported'
    });
    
    // Test microphone access
    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        results.push({
          category: 'Audio',
          test: 'Microphone Access',
          status: 'PASS',
          message: 'Microphone permission granted'
        });
      } catch (error) {
        results.push({
          category: 'Audio',
          test: 'Microphone Access',
          status: 'FAIL',
          message: `Microphone access denied: ${error}`
        });
      }
    } else {
      results.push({
        category: 'Audio',
        test: 'Microphone Access',
        status: 'FAIL',
        message: 'getUserMedia not available'
      });
    }
    
    return results;
  }
  
  private static async testMobileCompatibility(): Promise<DiagnosticResult[]> {
    const results: DiagnosticResult[] = [];
    
    // Device detection
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    results.push({
      category: 'Mobile',
      test: 'Device Type',
      status: 'PASS',
      message: isMobile ? 'Mobile device detected' : 'Desktop device'
    });
    
    // Screen size
    const isSmallScreen = window.innerWidth <= 768;
    results.push({
      category: 'Mobile',
      test: 'Screen Size',
      status: 'PASS',
      message: `${window.innerWidth}x${window.innerHeight} (${isSmallScreen ? 'Mobile' : 'Desktop'} layout)`
    });
    
    // Touch support
    const hasTouch = 'ontouchstart' in window;
    results.push({
      category: 'Mobile',
      test: 'Touch Support',
      status: hasTouch ? 'PASS' : 'WARN',
      message: hasTouch ? 'Touch events supported' : 'No touch support detected'
    });
    
    return results;
  }
  
  private static checkBrowserSupport(): boolean {
    // Check for essential modern browser features
    return !!(
      window.fetch &&
      window.Promise &&
      window.WebSocket &&
      typeof Audio !== 'undefined' &&
      navigator.mediaDevices
    );
  }
  
  static generateDiagnosticReport(results: DiagnosticResult[]): string {
    const categories = [...new Set(results.map(r => r.category))];
    
    let report = '📊 BUDDY AI DIAGNOSTIC REPORT\n';
    report += '='.repeat(50) + '\n\n';
    
    const passCount = results.filter(r => r.status === 'PASS').length;
    const failCount = results.filter(r => r.status === 'FAIL').length;
    const warnCount = results.filter(r => r.status === 'WARN').length;
    
    report += `Overall Status: ${failCount === 0 ? '✅ HEALTHY' : '❌ ISSUES DETECTED'}\n`;
    report += `Tests: ${passCount} passed, ${failCount} failed, ${warnCount} warnings\n\n`;
    
    categories.forEach(category => {
      report += `${category.toUpperCase()}\n`;
      report += '-'.repeat(20) + '\n';
      
      const categoryResults = results.filter(r => r.category === category);
      categoryResults.forEach(result => {
        const statusIcon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
        const timing = result.timing ? ` (${result.timing}ms)` : '';
        report += `${statusIcon} ${result.test}: ${result.message}${timing}\n`;
      });
      report += '\n';
    });
    
    return report;
  }
}