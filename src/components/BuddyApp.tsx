import { useState, useEffect, useRef } from 'react';
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

  // Load saved data on mount
  useEffect(() => {
    console.log('🔍 useEffect running...');
    loadUserData();
  }, []);

  const loadUserData = async () => {
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
  };

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
        console.log('⚠️ Empty transcript - trying again');
      } else {
        console.log('✅ Speech recognized:', transcribedText);
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
      
      console.error('❌ Transcription failed:', error);
      // Only show toast for actual errors, not empty transcripts
      if (!error.message.includes('Empty transcript')) {
        toast({
          title: "Transcription failed",
          description: "Could not convert speech to text. Please try again.",
          variant: "destructive"
        });
      }
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
      
      console.log('✅ Buddy responded! Playing voice...');
      
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

  // Removed auto TTS test to prevent audio conflicts

  // playVoice helper function
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

      console.log('🔊 Starting SURESHOT voice playback for:', text.substring(0, 50));
      
      // Always use English for TTS regardless of user language
      console.log('🌐 TTS Language: Always English');

      // Call speak-gtts function with text only (always English)
      console.log('📞 Calling speak-gtts function...');
      const { data, error } = await supabase.functions.invoke('speak-gtts', {
        body: { text } // Only send text, TTS will always be in English
      });

      console.log('📡 TTS Response received');

      if (error) {
        console.error('❌ TTS Function Error:', error);
        throw new Error(error.message || 'Failed to generate speech');
      }

      if (!data?.audioContent) {
        console.error('❌ No audio content in response');
        throw new Error('No audio content received from TTS service');
      }

      console.log('✅ Audio content received, length:', data.audioContent.length);

      // Create Blob from base64 data - MOST RELIABLE METHOD
      try {
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // FIXED: Create blob with correct MP3 audio type (TTS generates MP3)
        const audioBlob = new Blob([bytes], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        console.log('🎵 Audio Blob created successfully, size:', audioBlob.size, 'bytes');
        
        // Create audio element
        const audio = new Audio(audioUrl);
        audio.crossOrigin = 'anonymous';
        
        // Set playback rate
        const getPlaybackRate = (ageYears: number) => {
          if (ageYears <= 5) return 0.8;
          if (ageYears <= 8) return 0.9;
          return 1.0;
        };
        
        audio.playbackRate = getPlaybackRate(childProfile.ageYears);
        console.log('🎛️ Playback rate set to:', audio.playbackRate);

        // Event handlers
        audio.addEventListener('canplay', () => {
          console.log('🎵 Audio ready to play');
        });

        audio.addEventListener('ended', () => {
          console.log('✅ Audio playback completed');
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          
          if (childProfile && childProfile.ageYears <= 7) {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.6 }
            });
          }
          
          setIsSpeaking(false);
          console.log('✅ Buddy finished speaking!');
        });

        audio.addEventListener('error', (e) => {
          console.error('❌ Audio error:', e, audio.error);
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
          throw new Error(`Audio playback failed: ${audio.error?.message || 'Unknown error'}`);
        });

        // FIXED: Simplified and working audio play logic
        const attemptPlay = async () => {
          try {
            console.log('🎵 Attempting to play audio...');
            await audio.play();
            setIsSpeaking(true);
            console.log('✅ Audio playing successfully!');
            
          } catch (playError) {
            console.error('❌ Play failed:', playError);
            
            if (playError.name === 'NotAllowedError') {
              console.log('🔊 Need user interaction for audio');
              
              // Simple user interaction handler
              const enableAudio = async () => {
                try {
                  await audio.play();
                  setIsSpeaking(true);
                  console.log('✅ Audio enabled after user interaction!');
                  
                  // Remove listeners
                  document.removeEventListener('click', enableAudio);
                  document.removeEventListener('touchstart', enableAudio);
                  
                } catch (retryError) {
                  console.error('❌ Audio still failed:', retryError);
                  setIsSpeaking(false);
                  URL.revokeObjectURL(audioUrl);
                  
                  toast({
                    title: "Audio Error",
                    description: "Cannot play audio even with user interaction",
                    variant: "destructive"
                  });
                }
              };
              
              // Add interaction listeners
              document.addEventListener('click', enableAudio, { once: true });
              document.addEventListener('touchstart', enableAudio, { once: true });
              document.addEventListener('keydown', enableAudio, { once: true });
              
              // Cleanup after 30 seconds
              setTimeout(() => {
                document.removeEventListener('click', enableAudio);
                document.removeEventListener('touchstart', enableAudio);
                document.removeEventListener('keydown', enableAudio);
                URL.revokeObjectURL(audioUrl);
                setIsSpeaking(false);
              }, 30000);
              
            } else {
              throw playError;
            }
          }
        };

        // FIXED: Remove audio.load() call that was causing issues
        await attemptPlay();
        
      } catch (blobError) {
        console.error('❌ Blob creation failed:', blobError);
        throw new Error('Failed to process audio data');
      }

    } catch (error) {
      console.error('❌ SURESHOT playVoice failed:', error);
      setIsSpeaking(false);
      toast({
        title: "Voice Error",
        description: `Audio system failed: ${error.message}`,
        variant: "destructive"
      });
    }
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

  // Enthusiastic auto-greeting when child logs in
  const playWelcomeGreeting = async () => {
    if (!childProfile || hasGreeted) return;
    
    const greetings = [
      `Hi ${childProfile.name}! 🌟 I'm Buddy, your super fun AI friend! I can help you learn about animals, tell amazing stories, teach you cool science facts, play word games, and answer any questions you have! What would you like to explore first?`,
      `Hello there, ${childProfile.name}! 🚀 Welcome to our amazing adventure together! I'm Buddy and I love chatting with curious kids like you! I can tell you about space, animals, help with math, create fun stories, and so much more! What sounds exciting to you today?`,
      `Hey ${childProfile.name}! 🎉 I'm Buddy and I'm SO excited to be your learning buddy! We can discover incredible things about nature, practice reading together, solve fun puzzles, learn about different countries, or just have a great chat! What adventure should we start with?`
    ];
    
    const randomGreeting = greetings[Math.floor(Math.random() * greetings.length)];
    
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

  // Auto greeting when profile is loaded - ESSENTIAL for child engagement and audio trigger
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
          {/* Step 7.7: Self-test buttons */}
          <div className="flex gap-1 mr-2">
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
          
           {/* Conversation Messages with animations */}
          {messages.length > 0 ? (
            messages.map((message, index) => (
              <Card 
                key={message.id} 
                className={`
                  p-4 animate-fade-in
                  ${message.type === 'user' 
                    ? 'bg-white border-gray-200 ml-8' 
                    : 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200 mr-8'
                  }
                  ${message.type === 'buddy' ? 'animate-scale-in' : ''}
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
          {/* Big Mic Button with animations */}
          <Button
            className={`
              w-20 h-20 rounded-full shadow-lg transition-all duration-200 
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-200 animate-pulse' 
                : isSpeaking
                ? 'bg-green-500 hover:bg-green-600 scale-105 shadow-green-200 animate-pulse'
                : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-200 hover-scale'
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
        
        {/* Hint Text with animations */}
        <p className="text-center text-gray-600 text-sm mt-4 animate-fade-in">
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