import { useState, useEffect, useRef } from 'react';
import { Mic, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConsentBanner } from './ConsentBanner';
import { ParentSettingsModal, ChildProfile } from './ParentSettingsModal';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const { toast } = useToast();
  
  // Microphone recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  console.log('🔍 State initialized, running useEffect...');

  // Load saved data on mount
  useEffect(() => {
    console.log('🔍 useEffect running...');
    const savedConsent = localStorage.getItem('buddy-consent');
    const savedProfile = localStorage.getItem('buddy-child-profile');
    
    if (savedConsent === 'granted') {
      setHasConsent(true);
    } else {
      // Show consent banner on first visit
      setShowConsent(true);
    }
    
    if (savedProfile) {
      try {
        setChildProfile(JSON.parse(savedProfile));
      } catch (e) {
        console.error('Failed to parse saved profile:', e);
      }
    }
    console.log('🔍 useEffect completed');
  }, []);

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

  const handleProfileSave = (profile: ChildProfile) => {
    localStorage.setItem('buddy-child-profile', JSON.stringify(profile));
    setChildProfile(profile);
    
    toast({
      title: `Settings saved! 👋`,
      description: `Buddy is now ready for ${profile.name}!`,
    });
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
        toast({
          title: "Speech recognized! 🎯",
          description: `"${transcribedText.slice(0, 50)}${transcribedText.length > 50 ? '...' : ''}"`
        });
        
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
      
      toast({
        title: "Buddy responded! 🎉",
        description: "Your AI friend is ready to chat!"
      });
      
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
      
      // Configure MediaRecorder for WebM/Opus
      const options = {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 16000
      };
      
      // Fallback if WebM/Opus not supported
      const mimeType = MediaRecorder.isTypeSupported(options.mimeType) 
        ? options.mimeType 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 16000 
      });
      
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
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

  // CORS self-test for speak-gtts function
  const testSpeakFunction = async () => {
    try {
      console.log('🧪 Testing speak-gtts CORS...');
      const { data, error } = await supabase.functions.invoke('speak-gtts', {
        body: { text: 'Test', lang: 'en-IN' }
      });
      console.log('✅ speak-gtts CORS test result:', data ? 'SUCCESS' : 'FAILED', { data, error });
    } catch (error) {
      console.error('❌ speak-gtts CORS test failed:', error);
    }
  };

  // Run CORS test on mount (only once)
  useEffect(() => {
    if (hasConsent && childProfile) {
      testSpeakFunction();
    }
  }, [hasConsent, childProfile]);

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
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(true)}
          className="p-2 hover:bg-gray-100 rounded-full"
        >
          <Settings className="w-6 h-6 text-gray-600" />
        </Button>
      </header>

      {/* Chat Area */}
      <div className="flex-1 p-4 overflow-y-auto">
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
          
          {/* Conversation Messages */}
          {messages.length > 0 ? (
            messages.map((message) => (
              <Card 
                key={message.id} 
                className={`p-4 ${
                  message.type === 'user' 
                    ? 'bg-white border-gray-200 ml-8' 
                    : 'bg-gradient-to-r from-blue-100 to-purple-100 border-blue-200 mr-8'
                }`}
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

      {/* Bottom Controls */}
      <div className="p-6 bg-white/80 backdrop-blur-sm border-t border-blue-200">
        <div className="max-w-2xl mx-auto flex justify-center">
          {/* Big Mic Button */}
          <Button
            className={`
              w-20 h-20 rounded-full shadow-lg transition-all duration-200 
              ${isRecording 
                ? 'bg-red-500 hover:bg-red-600 scale-110 shadow-red-200' 
                : 'bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-blue-200'
              }
              ${(!hasConsent || !childProfile) ? 'opacity-75' : ''}
            `}
            onMouseDown={handleMicPress}
            onMouseUp={handleMicRelease}
            onTouchStart={handleMicPress}
            onTouchEnd={handleMicRelease}
          >
            <Mic className="w-8 h-8 text-white" />
          </Button>
        </div>
        
        {/* Hint Text */}
        <p className="text-center text-gray-600 text-sm mt-4">
          {!hasConsent ? "Click to get started" :
           !childProfile ? "Set up profile first" :
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