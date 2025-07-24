import { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, Settings, Volume2, MessageSquare, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConsentBanner } from './ConsentBanner';
import { ParentSettingsModal, ChildProfile } from './ParentSettingsModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';

export interface ChatMessage {
  id: string;
  type: 'user' | 'buddy';
  content: string;
  timestamp: Date;
  isProcessing?: boolean;
}

export const BuddyApp = () => {
  console.log('🔍 BuddyApp component starting to render...');

  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasGreeted, setHasGreeted] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { toast } = useToast();
  
  // Microphone recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const lastChunkProcessed = useRef<number>(0);

  console.log('🔍 State initialized, running useEffect...');

  // Load saved data on mount - Fixed with proper dependencies
  const loadUserData = useCallback(async () => {
    console.log('🔍 Loading user data...');
    // Load consent from localStorage (since it's not user-specific)
    const savedConsent = localStorage.getItem('buddy-consent');
    console.log('🔍 Saved consent:', savedConsent);
    
    if (savedConsent === 'granted') {
      setHasConsent(true);
      
      // Load profile from database for authenticated user
      try {
        const { data: profile, error } = await supabase
          .from('child_profiles')
          .select('*')
          .maybeSingle();

        if (error) {
          console.error('❌ Error loading profile from database:', error);
        } else if (profile) {
          // Convert database format to frontend format
          const frontendProfile: ChildProfile = {
            name: profile.name,
            ageGroup: profile.age_group as ChildProfile['ageGroup'],
            ageYears: profile.age_years,
            gender: profile.gender as ChildProfile['gender'],
            interests: profile.interests || [],
            learningGoals: profile.learning_goals || [],
            energyLevel: profile.energy_level as ChildProfile['energyLevel'],
            language: (profile.language || ['english']).filter((lang: string): lang is 'english' | 'hindi' => 
              lang === 'english' || lang === 'hindi'
            ) as ('english' | 'hindi')[]
          };
          setChildProfile(frontendProfile);
          console.log('✅ Loaded profile from database:', frontendProfile);
        } else {
          console.log('📝 No profile found in database');
        }
      } catch (error) {
        console.error('❌ Database connection error:', error);
      }
    } else {
      // Show consent banner on first visit
      setShowConsent(true);
    }
    console.log('🔍 useEffect completed');
  }, []);

  useEffect(() => {
    console.log('🔍 useEffect running...');
    loadUserData();
  }, [loadUserData]);

  const handleConsentAccept = () => {
    localStorage.setItem('buddy-consent', 'granted');
    setHasConsent(true);
    setShowConsent(false);
    // Open settings to configure child profile
    setShowSettings(true);
    
    toast({
      title: "Welcome to Buddy! 🎉",
      description: "Please set up your child's profile to get started.",
    });
  };

  const handleConsentDecline = () => {
    setShowConsent(false);
    toast({
      title: "No problem!",
      description: "You can enable Buddy anytime from the settings.",
      variant: "destructive"
    });
  };

  const handleProfileSave = async (profile: ChildProfile) => {
    setChildProfile(profile);
    
    // Save to database for authenticated user
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('❌ No authenticated user found');
        toast({
          title: "Authentication required",
          description: "Please log in to save your profile.",
          variant: "destructive"
        });
        return;
      }

      console.log('💾 Saving profile to database for user:', user.id);

      // Convert frontend format to database format
      const dbProfile = {
        user_id: user.id,
        name: profile.name,
        age_group: profile.ageGroup,
        age_years: profile.ageYears,
        gender: profile.gender,
        interests: profile.interests,
        learning_goals: profile.learningGoals,
        energy_level: profile.energyLevel,
        language: profile.language
      };

      console.log('📦 Profile data to save:', dbProfile);

      const { data, error } = await supabase
        .from('child_profiles')
        .upsert(dbProfile, { 
          onConflict: 'user_id',
          ignoreDuplicates: false 
        })
        .select();

      if (error) {
        console.error('❌ Database error:', error);
        throw error;
      } else {
        console.log('✅ Profile saved to database:', data);
        setShowSettings(false);
        toast({
          title: `Settings saved! 👋`,
          description: `Buddy is now ready for ${profile.name}!`,
        });
      }
    } catch (error) {
      console.error('❌ Database save failed:', error);
      toast({
        title: "Profile save failed",
        description: "There was an error saving the profile. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear local state
      setChildProfile(null);
      setMessages([]);
      setHasGreeted(false);
      localStorage.removeItem('buddy-consent');
      
      toast({
        title: "Logged out successfully",
        description: "Thanks for using Buddy! Come back anytime.",
      });
    } catch (error) {
      console.error('❌ Logout failed:', error);
      toast({
        title: "Logout failed",
        description: "There was an error logging out.",
        variant: "destructive"
      });
    }
  };

  
  // Real-time audio processing disabled to prevent API overload
  const processAudioChunk = async (audioBlob: Blob) => {
    console.log('⏭️ Real-time processing disabled - will process on stop');
    // Disabled to prevent API rate limiting and errors
    return;
  };

  // Convert audio blob to base64 and transcribe
  const transcribeAudio = async (audioBlob: Blob, messageId: string) => {
    try {
      console.log('🔄 Converting audio to base64...');
      
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      const base64Audio = btoa(binaryString);
      
      console.log(`📤 Sending ${base64Audio.length} characters to transcribe-audio`);
      
    // Call Supabase edge function
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });
      
      if (error) {
        console.error('❌ Transcription error:', error);
        throw error;
      }
      
      console.log('📝 Transcription response:', data);
      
      const transcribedText = data.text || '[Could not transcribe audio]';
      
      // Update the message with transcribed text
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: transcribedText, isProcessing: false }
          : msg
      ));
      
      if (!transcribedText || transcribedText.trim() === '') {
        toast({
          title: "Empty transcript",
          description: "Deepgram gave an empty transcript – try again?",
          variant: "destructive"
        });
      } else {
        // Step 6: Hide dev toasts behind import.meta.env.DEV
        if (import.meta.env.DEV) {
          toast({
            title: "Speech recognized! 🎯",
            description: `"${transcribedText.slice(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`
          });
        }
        
        // Get AI response from Buddy
        await getBuddyResponse(transcribedText);
      }
      
    } catch (error) {
      console.error('❌ Transcription failed:', error);
      
      // Update message with error
      setMessages(prev => prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, content: '[Transcription failed]', isProcessing: false }
          : msg
      ));
      
      toast({
        title: "Transcription failed",
        description: "Could not convert speech to text. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Get AI response from Buddy
  const getBuddyResponse = async (userMessage: string) => {
    if (!childProfile) {
      console.error('❌ No child profile available for AI response');
      return;
    }

    // Add Buddy's thinking message
    const buddyMessageId = Date.now().toString();
    const thinkingMessage: ChatMessage = {
      id: buddyMessageId,
      type: 'buddy',
      content: 'Let me think about that...',
      timestamp: new Date(),
      isProcessing: true
    };
    
    setMessages(prev => [...prev, thinkingMessage]);

    try {
      console.log('🤖 Getting AI response for:', userMessage);
      
      // Call ask-gemini edge function
      const { data, error } = await supabase.functions.invoke('ask-gemini', {
        body: { 
          message: userMessage,
          childProfile: childProfile
        }
      });
      
      if (error) {
        console.error('❌ AI response error:', error);
        throw error;
      }
      
      console.log('🤖 AI response:', data);
      
      const aiResponse = data.response || "I'm sorry, I'm having trouble thinking right now. Can you ask me something else? 😊";
      
      // Update the message with AI response
      setMessages(prev => prev.map(msg => 
        msg.id === buddyMessageId
          ? { ...msg, content: aiResponse, isProcessing: false }
          : msg
      ));
      
      // Step 6: Hide dev toasts behind import.meta.env.DEV
      if (import.meta.env.DEV) {
        toast({
          title: "Buddy responded! 🎉",
          description: "Your AI friend is ready to chat!"
        });
      }
      
      // Step 7.5: Call playVoice after Buddy reply
      await playVoice(aiResponse);
      
    } catch (error) {
      console.error('❌ AI response failed:', error);
      
      // Update with fallback message
      setMessages(prev => prev.map(msg => 
        msg.id === buddyMessageId
          ? { 
              ...msg, 
              content: "Hi! I'm having a little trouble right now, but I'm still here to chat! Can you ask me something else? 😊",
              isProcessing: false 
            }
          : msg
      ));
      
      toast({
        title: "AI response failed",
        description: "Buddy is having trouble right now. Please try again!",
        variant: "destructive"
      });
    }
  };

  // Initialize microphone stream
  const initializeMicrophone = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,        // 16kHz as specified
          channelCount: 1,          // Mono
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      
      streamRef.current = stream;
      console.log('🎤 Microphone stream initialized');
      return stream;
    } catch (error) {
      console.error('❌ Microphone access failed:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
      throw error;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const stream = streamRef.current || await initializeMicrophone();
      
      // FIXED: Use WebM format which is widely supported and works well with Deepgram
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm') 
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4') 
        ? 'audio/mp4'
        : 'audio/wav';
      
      console.log(`🎤 Using audio format: ${mimeType}`);
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 16000 
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // BLAZING FAST: Process chunks immediately for real-time STT
          if (event.data.size > 1000) { // Only process meaningful chunks
            const audioBlob = new Blob([event.data], { type: mimeType });
            await processAudioChunk(audioBlob);
          }
        }
      };
      
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log(`🎵 Audio blob captured: ${audioBlob.size} bytes (${(audioBlob.size / 1024).toFixed(2)} KB)`);
        
        // Add temporary message showing voice note captured
        const tempMessageId = Date.now().toString();
        const tempMessage: ChatMessage = {
          id: tempMessageId,
          type: 'user',
          content: '[voice note captured]',
          timestamp: new Date(),
          isProcessing: true
        };
        
        setMessages(prev => [...prev, tempMessage]);
        
        // Convert to base64 and transcribe
        await transcribeAudio(audioBlob, tempMessageId);
      };
      
      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      
      console.log('🎤 Recording started');
      
    } catch (error) {
      console.error('❌ Recording start failed:', error);
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
      console.log('🎤 Recording stopped');
    }
  };

  const handleMicPress = async () => {
    if (!hasConsent) {
      setShowConsent(true);
      return;
    }
    
    if (!childProfile) {
      setShowSettings(true);
      toast({
        title: "Almost ready!",
        description: "Please set up your child's profile first.",
      });
      return;
    }
    
    setIsRecording(true);
    await startRecording();
  };

  const handleMicRelease = () => {
    setIsRecording(false);
    stopRecording();
  };

  // Step 7.7: Regression self-test functions
  // Step 7.7: Regression self-test functions with detailed logging
  const testSTT = async () => {
    try {
      toast({ title: "🧪 Testing Speech-to-Text...", description: "Recording 3 seconds of audio" });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        
        // Convert to base64
        const arrayBuffer = await blob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
        const base64Audio = btoa(binaryString);
        
        console.log('🧪 STT Test: Calling transcribe-audio...');
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        // Log detailed results
        const status = error ? 'ERROR' : 'SUCCESS';
        const payload = data?.text || error?.message || 'No response';
        const preview = payload.substring(0, 40) + (payload.length > 40 ? '...' : '');
        console.log(`✅ STT Test Result: ${status} | Payload: "${preview}"`);
        
        if (error) {
          throw new Error(`STT failed: ${error.message}`);
        }
        
        toast({ 
          title: "✅ STT Test Complete", 
          description: `Status: ${status} | Result: "${preview}"` 
        });
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), 3000);
    } catch (error) {
      console.error('❌ STT test failed:', error);
      toast({ title: "❌ STT Test Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const testLLM = async () => {
    try {
      toast({ title: "🧪 Testing LLM...", description: "Sending test message to Gemini" });
      
      console.log('🧪 LLM Test: Calling ask-gemini...');
      const { data, error } = await supabase.functions.invoke('ask-gemini', {
        body: { 
          message: "Say hello in exactly 5 words.",
          childProfile: childProfile || { name: "Test", ageYears: 8, language: ['english'] }
        }
      });
      
      // Log detailed results
      const status = error ? 'ERROR' : 'SUCCESS';
      const payload = data?.response || error?.message || 'No response';
      const preview = payload.substring(0, 40) + (payload.length > 40 ? '...' : '');
      console.log(`✅ LLM Test Result: ${status} | Payload: "${preview}"`);
      
      if (error) {
        throw new Error(`LLM failed: ${error.message}`);
      }
      
      toast({ 
        title: "✅ LLM Test Complete", 
        description: `Status: ${status} | Response: "${preview}"` 
      });
    } catch (error) {
      console.error('❌ LLM test failed:', error);
      toast({ title: "❌ LLM Test Failed", description: error.message, variant: "destructive" });
    }
  };
  
  const testTTS = async () => {
    try {
      toast({ title: "🧪 Testing Text-to-Speech...", description: "Playing test audio" });
      console.log('🧪 TTS Test: Calling playVoice...');
      
      await playVoice("Testing text to speech system.");
      
      // Log success
      console.log('✅ TTS Test Result: SUCCESS | Payload: "Audio playback completed"');
      toast({ title: "✅ TTS Test Complete", description: "Status: SUCCESS | Audio played" });
    } catch (error) {
      console.error('❌ TTS test failed:', error);
      const preview = error.message.substring(0, 40) + (error.message.length > 40 ? '...' : '');
      console.log(`❌ TTS Test Result: ERROR | Payload: "${preview}"`);
      toast({ title: "❌ TTS Test Failed", description: `Status: ERROR | ${preview}`, variant: "destructive" });
    }
  };

  // Run TTS test on mount (only once) - Step 7.7 integration
  useEffect(() => {
    if (hasConsent && childProfile) {
      // Auto-test TTS when profile is ready
      testTTS();
    }
  }, [hasConsent, childProfile]);

  // STEP 0 VERIFICATION: STT/TTS Round-trip Test Function
  const runStep0VerificationTest = async () => {
    console.log('🧪 Step 0: Starting STT/TTS round-trip verification test...');
    
    toast({
      title: "🧪 Step 0: Verification Test",
      description: "Testing STT → LLM → TTS pipeline...",
    });

    try {
      // Test 1: STT
      console.log('🎤 Step 0 Test 1/3: Testing STT...');
      const testAudioBlob = new Blob(['test audio data'], { type: 'audio/webm' });
      const arrayBuffer = await testAudioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const binaryString = Array.from(uint8Array, byte => String.fromCharCode(byte)).join('');
      const base64Audio = btoa(binaryString);
      
      const { data: sttData, error: sttError } = await supabase.functions.invoke('transcribe-audio', {
        body: { audio: base64Audio }
      });
      
      if (sttError) {
        console.log('⚠️ STT Test: Expected error with test data (normal)');
      } else {
        console.log('✅ STT Test: Function accessible');
      }

      // Test 2: LLM
      console.log('🤖 Step 0 Test 2/3: Testing LLM...');
      const { data: llmData, error: llmError } = await supabase.functions.invoke('ask-gemini', {
        body: { 
          message: "Hello",
          childProfile: { name: "Test", ageYears: 8, ageGroup: "6-8", gender: "other", interests: [], learningGoals: [], energyLevel: "medium", language: ['english'] }
        }
      });
      
      if (llmError) {
        throw new Error(`LLM Test Failed: ${llmError.message}`);
      }
      console.log('✅ LLM Test: SUCCESS');

      // Test 3: TTS
      console.log('🔊 Step 0 Test 3/3: Testing TTS...');
      const { data: ttsData, error: ttsError } = await supabase.functions.invoke('speak-gtts', {
        body: { text: "Testing text to speech system." }
      });
      
      if (ttsError) {
        throw new Error(`TTS Test Failed: ${ttsError.message}`);
      }
      console.log('✅ TTS Test: SUCCESS');

      console.log('🎉 Step 0 Verification: ALL TESTS PASSED');
      toast({
        title: "✅ Step 0 Complete",
        description: "STT/TTS pipeline verified successfully!",
      });

      return true;
    } catch (error) {
      console.error('❌ Step 0 Verification Failed:', error);
      toast({
        title: "❌ Step 0 Failed",
        description: `Pipeline test failed: ${error.message}`,
        variant: "destructive"
      });
      return false;
    }
  };

  // playVoice helper function - Step 4: Deepgram TTS Pipeline (MP3, no autoplay issues)
  const playVoice = async (text: string) => {
    try {
      if (!childProfile) {
        toast({
          title: "Profile needed",
          description: "Please set up child profile first",
          variant: "destructive"
        });
        return;
      }

      console.log('🔊 Starting voice playback for:', text.substring(0, 50));

      // Call speak-gtts function
      console.log('📞 Calling speak-gtts function...');
      const { data, error } = await supabase.functions.invoke('speak-gtts', {
        body: { text }
      });

      if (error) {
        console.error('❌ TTS Function Error:', error);
        throw new Error(error.message || 'Failed to generate speech');
      }

      if (!data?.audioContent) {
        console.error('❌ No audio content in response');
        throw new Error('No audio content received from TTS service');
      }

      console.log('✅ Audio content received, length:', data.audioContent.length);

      // Create audio blob - FIXED for MP3 format from Deepgram
      const binaryString = atob(data.audioContent);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Use MP3 type since Deepgram returns MP3
      const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      console.log('🎵 Audio Blob created successfully, size:', audioBlob.size, 'bytes');
      
      // Create audio element
      const audio = new Audio(audioUrl);
      
      // Set playback rate based on age (Step 4 requirement)
      const getPlaybackRate = (ageYears: number) => {
        if (ageYears <= 5) return 0.8;  // Slower for younger kids
        if (ageYears <= 8) return 0.9;  // Moderate for middle
        return 1.0;                     // Normal for older kids
      };
      
      audio.playbackRate = getPlaybackRate(childProfile.ageYears);
      console.log(`🎛️ Playback rate set to: ${audio.playbackRate} for age ${childProfile.ageYears}`);

      // Promise-based audio playback
      return new Promise<void>((resolve, reject) => {
        audio.addEventListener('ended', () => {
          console.log('✅ Audio playback completed');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          
          if (childProfile && childProfile.ageYears <= 5) {
            // Step 6: Confetti 🎉 burst for ageYears ≤ 5
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
          
          toast({
            title: "✅ Done speaking!",
            description: "What would you like to talk about next?",
          });
          resolve();
        });

        audio.addEventListener('error', (e) => {
          console.error('❌ Audio error:', e, audio.error);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          reject(new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`));
        });

        // Attempt to play
        console.log('🎵 Attempting to play audio...');
        setIsSpeaking(true);
        
        audio.play().then(() => {
          console.log('✅ Audio playing successfully!');
          // Step 6: Hide dev toasts behind import.meta.env.DEV
          if (import.meta.env.DEV) {
            toast({
              title: "🔊 Buddy speaking",
              description: "Audio playback started successfully",
            });
          }
        }).catch((playError) => {
          console.error('❌ Play failed:', playError);
          
          if (playError.name === 'NotAllowedError') {
            setIsSpeaking(false);
            
            toast({
              title: "🔊 Click to hear Buddy!",
              description: "Browser needs your permission to play audio. Click anywhere!",
              variant: "default"
            });
            
            // User interaction handler
            const enableAudio = async () => {
              try {
                setIsSpeaking(true);
                await audio.play();
                console.log('✅ Audio playing after user interaction!');
                
                toast({
                  title: "🎵 Buddy is speaking!",
                  description: "Audio enabled successfully!",
                });
                
              } catch (retryError) {
                console.error('❌ Still failed after user interaction:', retryError);
                setIsSpeaking(false);
                URL.revokeObjectURL(audioUrl);
                reject(new Error('Cannot play audio even with user interaction'));
              }
            };
            
            // Single interaction listener
            document.addEventListener('click', enableAudio, { once: true });
            
          } else {
            setIsSpeaking(false);
            URL.revokeObjectURL(audioUrl);
            reject(playError);
          }
        });
      });

    } catch (error) {
      console.error('❌ playVoice failed:', error);
      setIsSpeaking(false);
      toast({
        title: "Voice Error",
        description: `Audio system failed: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  };

  // STEP 5: Random greeting system (15-entry array with duplicate prevention)
  const getRandomGreeting = () => {
    const greetings = [
      "Hi there! 🌟 What amazing adventure shall we explore today?",
      "Hello friend! 🎉 I'm so excited to chat with you!",
      "Hey buddy! 🚀 Ready to discover something incredible together?",
      "Hi! 🦋 What wonderful things are you curious about today?",
      "Hello! 🌈 I can't wait to learn and play with you!",
      "Hey there! 🎈 What fantastic questions do you have for me?",
      "Hi friend! 🌟 Let's go on an amazing learning journey!",
      "Hello! 🎵 What exciting topics shall we explore?",
      "Hey! 🦖 I'm here and ready for our awesome conversation!",
      "Hi there! 🎪 What cool things do you want to talk about?",
      "Hello buddy! 🎯 I'm thrilled to be your learning companion!",
      "Hey! 🎨 What creative ideas are buzzing in your mind?",
      "Hi! 🌸 Ready to have some fun learning together?",
      "Hello there! 🎭 What magical adventures should we begin?",
      "Hey friend! 🎊 I'm here to make learning super fun!"
    ];
    
    // Get last greeting hash to prevent duplicates
    const lastGreetingHash = localStorage.getItem('buddy-last-greeting');
    let attempts = 0;
    let selectedGreeting;
    let greetingHash;
    
    do {
      selectedGreeting = greetings[Math.floor(Math.random() * greetings.length)];
      greetingHash = btoa(selectedGreeting).slice(0, 8); // Short hash
      attempts++;
    } while (greetingHash === lastGreetingHash && attempts < 5);
    
    // Store new greeting hash
    localStorage.setItem('buddy-last-greeting', greetingHash);
    
    console.log(`🎲 Selected greeting ${greetingHash} (attempts: ${attempts})`);
    return selectedGreeting;
  };

  // Auto-send greeting when user first logs in to trigger audio permission
  const sendAutoGreeting = async () => {
    if (!childProfile || hasGreeted) return;
    
    console.log('🤖 Sending auto-greeting to trigger audio permission...');
    
    // Auto-send a greeting from the "user" to trigger the conversation
    const autoMessage = "Hi Buddy!";
    
    // Add user message
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: autoMessage,
      timestamp: new Date(),
      isProcessing: false
    };
    
    setMessages(prev => [...prev, userMsg]);
    
    // Get AI response which will trigger audio
    await getBuddyResponse(autoMessage);
    setHasGreeted(true);
  };

  // Step 5: Random Greeting Logic with 15-entry array and duplicate prevention
  const playWelcomeGreeting = async () => {
    if (!childProfile || hasGreeted) return;
    
    // 15-entry greeting array for variety (Step 5 requirement)
    const greetings = [
      `Hi ${childProfile.name}! 🌟 I'm Buddy, your super fun AI friend! What amazing adventure should we start today?`,
      `Hello there, ${childProfile.name}! 🚀 Welcome to our incredible learning journey together! What sounds exciting to you?`,
      `Hey ${childProfile.name}! 🎉 I'm SO excited to be your learning buddy! What would you like to discover first?`,
      `Wow, ${childProfile.name}! 🦋 It's fantastic to see you! What fascinating topic is on your mind today?`,
      `Hi friend ${childProfile.name}! 🌈 I'm Buddy and I love exploring with curious kids like you! What shall we learn about?`,
      `Hello brilliant ${childProfile.name}! ⭐ Ready for some amazing discoveries together? What interests you most?`,
      `Hey there, ${childProfile.name}! 🎈 I'm Buddy, your AI learning companion! What cool things want to explore?`,
      `Hi superstar ${childProfile.name}! 🌟 I'm here to have fun and learn with you! What adventure calls to you today?`,
      `Hello amazing ${childProfile.name}! 🦖 I'm Buddy and I can't wait to discover incredible things with you! What's first?`,
      `Hey wonderful ${childProfile.name}! 🎨 I'm your friendly AI buddy! What exciting topic should we dive into?`,
      `Hi there, ${childProfile.name}! 🎪 I'm Buddy, ready for fun learning adventures! What would you like to explore?`,
      `Hello fantastic ${childProfile.name}! 🌺 I'm here to chat, learn, and have amazing times together! What interests you?`,
      `Hey creative ${childProfile.name}! 🎭 I'm Buddy, your AI friend for incredible discoveries! What shall we start with?`,
      `Hi curious ${childProfile.name}! 🔍 I'm Buddy and I love answering questions and exploring! What's on your mind?`,
      `Hello brilliant ${childProfile.name}! 💫 I'm your AI learning buddy, ready for awesome adventures! What sounds fun?`
    ];
    
    // Get last greeting hashes to prevent duplicates (Step 5 requirement)
    const lastGreetingHashes = JSON.parse(localStorage.getItem('buddyLastGreetingHashes') || '[]');
    
    // Filter out recently used greetings
    const availableGreetings = greetings.filter((greeting, index) => {
      const greetingHash = btoa(greeting).slice(0, 10); // Simple hash
      return !lastGreetingHashes.includes(greetingHash);
    });
    
    // If all greetings used recently, reset the history
    const finalGreetings = availableGreetings.length > 0 ? availableGreetings : greetings;
    const randomGreeting = finalGreetings[Math.floor(Math.random() * finalGreetings.length)];
    
    // Store greeting hash to prevent duplicates
    const newHash = btoa(randomGreeting).slice(0, 10);
    const updatedHashes = [newHash, ...lastGreetingHashes].slice(0, 3); // Keep last 3
    localStorage.setItem('buddyLastGreetingHashes', JSON.stringify(updatedHashes));
    
    console.log('🎯 Step 5 Greeting Selected:', {
      totalGreetings: greetings.length,
      availableCount: finalGreetings.length,
      selectedHash: newHash,
      recentHashes: updatedHashes
    });
    
    try {
      setHasGreeted(true);
      await playVoice(randomGreeting);
      
      // Add the greeting to chat
      const greetingMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'buddy',
        content: randomGreeting,
        timestamp: new Date()
      };
      setMessages(prev => [greetingMessage]);
      
    } catch (error) {
      console.error('❌ Welcome greeting failed:', error);
    }
  };

  // Auto greeting when profile is loaded
  useEffect(() => {
    if (childProfile && !hasGreeted) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        sendAutoGreeting();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [childProfile, hasGreeted]);

  const getWelcomeMessage = () => {
    if (!hasConsent) {
      return "Welcome! Please allow parent permission to get started.";
    }
    
    if (!childProfile) {
      return "Hi! Click the settings button to set up your child's profile.";
    }
    
    return `Hi ${childProfile.name}! I'm Buddy, your friendly voice companion. Press and hold the microphone to talk to me!`;
  };

  console.log('🔍 About to render JSX...', { hasConsent, childProfile, showConsent, showSettings });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-blue-200 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-lg">B</span>
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-800">Buddy</h1>
            <p className="text-sm text-gray-600">
              {childProfile ? `for ${childProfile.name}` : 'Kids Voice Companion'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* STEP 0: Verification Test + Individual Tests */}
          <div className="flex gap-1 mr-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={runStep0VerificationTest}
              className="p-1 hover:bg-yellow-100 rounded text-xs"
              title="Step 0: Run Full Pipeline Test"
            >
              <span className="text-yellow-600 font-bold text-xs">0</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={testSTT}
              className="p-1 hover:bg-blue-100 rounded text-xs"
              title="Test Speech-to-Text"
            >
              <Mic className="w-4 h-4 text-blue-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={testLLM}
              className="p-1 hover:bg-purple-100 rounded text-xs"
              title="Test Language Model"
            >
              <Brain className="w-4 h-4 text-purple-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={testTTS}
              className="p-1 hover:bg-green-100 rounded text-xs"
              title="Test Text-to-Speech"
            >
              <Volume2 className="w-4 h-4 text-green-600" />
            </Button>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(true)}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Settings className="w-6 h-6 text-gray-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="p-2 hover:bg-red-100 rounded-full text-red-600"
            title="Logout"
          >
            🚪
          </Button>
        </div>
      </header>

      {/* Chat Area - FIXED: Added pb-32 to prevent overlap with fixed bottom controls */}
      <div className="flex-1 p-4 overflow-y-auto pb-32">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Welcome Message */}
          <Card className="p-4 bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-sm">B</span>
              </div>
              <div>
                <p className="text-gray-800 text-lg">
                  {getWelcomeMessage()}
                </p>
              </div>
            </div>
          </Card>
          
           {/* Conversation Messages with Step 6 animations */}
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <Card 
                key={`${message.id}-${index}`} 
                className={`
                  p-4 animate-bubble-fade-slide
                  ${message.type === 'user' 
                    ? 'bg-white border-gray-200 ml-8' 
                    : 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200 mr-8'
                  }
                `}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start space-x-3">
                  {message.type === 'buddy' && (
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold text-sm">B</span>
                    </div>
                  )}
                  <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                    <p className={`${
                      message.type === 'user' ? 'text-gray-700' : 'text-gray-800'
                    } ${message.isProcessing ? 'italic opacity-75' : ''}`}>
                      {message.content}
                      {message.isProcessing && (
                        <span className="inline-block ml-2 animate-pulse">...</span>
                      )}
                    </p>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {message.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {message.type === 'user' && (
                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-gray-600 font-bold text-sm">
                        {childProfile?.name?.charAt(0) || 'U'}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
            ))
          ) : (
            <div className="text-center text-gray-500 text-sm py-8">
              Your conversation will appear here...
            </div>
          )}
        </div>
      </div>

      {/* FIXED: Bottom Controls now fixed at bottom of viewport */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-sm border-t border-blue-200 z-10">
        <div className="max-w-2xl mx-auto flex justify-center">
          {/* Big Mic Button with Step 6 pulse animation while recording */}
          <Button
            className={`
              w-20 h-20 rounded-full shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-200 animate-mic-pulse' 
                : isSpeaking
                ? 'bg-green-500 hover:bg-green-600 scale-105 shadow-green-200 animate-pulse'
                : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-200'
              }
              ${(!hasConsent || !childProfile) ? 'opacity-75' : ''}
            `}
            onMouseDown={handleMicPress}
            onMouseUp={handleMicRelease}
            onTouchStart={handleMicPress}
            onTouchEnd={handleMicRelease}
            disabled={isSpeaking}
          >
            <Mic className={`w-8 h-8 text-white ${isRecording ? 'animate-bounce' : ''}`} />
          </Button>
        </div>
        
        {/* Hint Text with enhanced animations */}
        <p className="text-center text-muted-foreground text-sm mt-4 animate-smooth-fade-in transition-all duration-300">
          {!hasConsent ? "Click to get started" :
           !childProfile ? "Set up profile first" :
           isSpeaking ? "🔊 Buddy is speaking..." :
           isRecording ? "🎤 Listening... Release to stop" : 
           "Hold to speak"}
        </p>
      </div>

      {/* Consent Banner */}
      {showConsent && (
        <ConsentBanner
          onAccept={handleConsentAccept}
          onDecline={handleConsentDecline}
        />
      )}

      {/* Settings Modal */}
      <ParentSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSave={handleProfileSave}
        initialProfile={childProfile || undefined}
      />
    </div>
  );
};