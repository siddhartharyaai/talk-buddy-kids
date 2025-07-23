import { useState, useEffect, useRef } from 'react';
import { Settings, Mic } from 'lucide-react';
import { ConversationArea } from './ConversationArea';
import { ParentSettingsModal } from './ParentSettingsModal';
import { ConsentBanner } from './ConsentBanner';
import { DevConsole } from './DevConsole';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export interface ChildProfile {
  name: string | null;
  age_band: "3-5" | "6-8" | "9-12" | null;
  lang: string | null;
}

export interface ChatMessage {
  role: "child" | "buddy";
  text: string;
  ts: number;
}

// Utility: convert Blob → ArrayBuffer
async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  return await blob.arrayBuffer();
}

// Add transcribeAudio helper using direct Deepgram API
async function transcribeAudio(blob: Blob): Promise<string> {
  const resp = await fetch(
    // auto‑detect language, punctuation on
    "https://api.deepgram.com/v1/listen?model=nova-2-general&punctuate=true&smart_format=true",
    {
      method: "POST",
      headers: {
        Authorization: `Token ${import.meta.env.VITE_DEEPGRAM_API_KEY}`,
        "Content-Type": "audio/webm;codecs=opus"
      },
      body: blob
    }
  );

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("DG error", resp.status, txt);
    throw new Error(`Deepgram ${resp.status}`);
  }

  const dg = await resp.json();
  console.log("DG raw:", dg);

  // safest path for new schema
  return (
    dg?.results?.channels?.[0]?.alternatives?.[0]?.paragraphs?.transcript ||
    dg?.results?.channels?.[0]?.alternatives?.[0]?.transcript ||
    ""
  ).trim();
}

export function BuddyApp() {
  const { toast } = useToast();
  
  // Core state
  const [childProfile, setChildProfile] = useState<ChildProfile>({
    name: null,
    age_band: null,
    lang: null
  });
  
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcriptText, setTranscriptText] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);
  
  // UI state
  const [showParentSettings, setShowParentSettings] = useState(false);
  const [showDevConsole, setShowDevConsole] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  
  // Audio recording refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingStartTimeRef = useRef<number>(0);
  
  // Check for consent on mount
  useEffect(() => {
    const consent = localStorage.getItem('buddy-parent-consent');
    setHasConsent(consent === 'true');
  }, []);
  
  // Handle consent
  const handleConsent = (granted: boolean) => {
    if (granted) {
      localStorage.setItem('buddy-parent-consent', 'true');
      setHasConsent(true);
      toast({
        title: "Thank you!",
        description: "You can now use voice features with your child.",
      });
    } else {
      toast({
        title: "Voice features disabled",
        description: "Your child can still chat using text when available.",
        variant: "destructive"
      });
    }
  };
  
  // Handle profile save
  const handleProfileSave = (profile: ChildProfile) => {
    setChildProfile(profile);
    setShowParentSettings(false);
    
    // Add welcome message to chat
    const welcomeMessage: ChatMessage = {
      role: "buddy",
      text: `Hi ${profile.name}! I'm Buddy, your voice companion. Tap & Talk when you're ready to chat!`,
      ts: Date.now()
    };
    setChatLog(prev => [...prev, welcomeMessage]);
    
    toast({
      title: "Profile saved!",
      description: `Welcome ${profile.name}! Ready to chat with Buddy.`,
    });
  };
  
  // Audio recording functions
  const startRecording = async () => {
    if (!hasConsent) {
      toast({
        title: "Consent required",
        description: "Please accept the consent banner first.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      streamRef.current = stream;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      const chunks: BlobPart[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        setAudioBlob(blob);
        
        console.log("Recorded audio length:", blob.size, "bytes");
        
        // Add voice note to chat
        const voiceMessage: ChatMessage = {
          role: "child",
          text: "[voice note captured]",
          ts: Date.now()
        };
        setChatLog(prev => [...prev, voiceMessage]);
        
        // NEW: call Deepgram
        setTranscriptText("…"); // reset
        try {
          const tx = await transcribeAudio(blob);
          setTranscriptText(tx);

          // Replace [voice note captured] bubble with real text
          setChatLog(prev => [
            ...prev.slice(0, -1),
            { role: "child", text: tx || "[inaudible]", ts: Date.now() }
          ]);

        } catch (err) {
          toast({ 
            title: "Speech‑to‑text error", 
            description: String(err), 
            variant: "destructive" 
          });
        }
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
      
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      recordingStartTimeRef.current = Date.now();
      setIsRecording(true);
      
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };
  
  // Handle mic button events
  const handleMicPress = () => {
    if (!isRecording) {
      startRecording();
    }
  };
  
  const handleMicRelease = () => {
    if (isRecording) {
      stopRecording();
    }
  };
  
  // Add seed data for demo
  useEffect(() => {
    const seedMessages: ChatMessage[] = [
      {
        role: "buddy",
        text: "Hello! I'm Buddy, your friendly voice companion. Ask your parent to set up your profile to get started!",
        ts: Date.now() - 60000
      }
    ];
    setChatLog(seedMessages);
  }, []);

  return (
    <div className="h-screen bg-background-gradient flex flex-col overflow-hidden">
      {/* Consent Banner */}
      {!hasConsent && (
        <ConsentBanner onConsent={handleConsent} />
      )}
      
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-card shadow-soft border-b border-border/50">
        <h1 className="text-3xl font-bold bg-buddy-gradient bg-clip-text text-transparent">
          Buddy
        </h1>
        <div className="flex items-center gap-2">
          {/* Dev Console Toggle (only in dev) */}
          <button
            onClick={() => setShowDevConsole(!showDevConsole)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            title="Developer Console"
          >
            🔧
          </button>
          
          {/* Parent Settings */}
          <button
            onClick={() => setShowParentSettings(true)}
            className="p-2 rounded-full hover:bg-secondary/50 transition-colors"
            title="Parent Settings"
          >
            <Settings className="w-6 h-6 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
      </header>
      
      {/* Developer Console */}
      {showDevConsole && (
        <DevConsole
          childProfile={childProfile}
          audioBlob={audioBlob}
          transcriptText={transcriptText}
          chatLog={chatLog}
          onClose={() => setShowDevConsole(false)}
        />
      )}
      
      {/* Conversation Area */}
      <div className="flex-1 overflow-hidden">
        <ConversationArea messages={chatLog} />
      </div>
      
      {/* Bottom Controls */}
      <div className="p-6 bg-card/50 backdrop-blur-sm border-t border-border/50">
        <div className="flex flex-col items-center gap-3">
          {/* Mic Button */}
          <div className="relative">
            {/* Pulse rings when recording */}
            {isRecording && (
              <>
                <div className="absolute inset-0 rounded-full bg-accent animate-pulse-ring" />
                <div className="absolute inset-0 rounded-full bg-accent animate-pulse-ring animation-delay-300" />
              </>
            )}
            
            <button
              onMouseDown={handleMicPress}
              onMouseUp={handleMicRelease}
              onTouchStart={handleMicPress}
              onTouchEnd={handleMicRelease}
              disabled={!hasConsent}
              className={`
                relative w-20 h-20 rounded-full flex items-center justify-center
                transition-all duration-300 transform active:scale-95
                ${isRecording 
                  ? 'bg-recording-gradient shadow-recording' 
                  : 'bg-buddy-gradient shadow-soft hover:shadow-lg'
                }
                ${!hasConsent ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <Mic className={`w-8 h-8 text-white ${isRecording ? 'animate-bounce-gentle' : ''}`} />
            </button>
          </div>
          
          {/* Instructions */}
          <p className="text-center text-muted-foreground">
            {!hasConsent 
              ? "Please accept consent to use voice features"
              : isRecording 
                ? "Release to stop recording"
                : "Hold to speak"
            }
          </p>
          
          {/* Visual feedback for transcript */}
          {transcriptText && transcriptText !== "…" && (
            <p className="text-xs text-muted-foreground/70 text-center max-w-xs">
              "{transcriptText}"
            </p>
          )}
        </div>
      </div>
      
      {/* Modals */}
      <ParentSettingsModal
        open={showParentSettings}
        onClose={() => setShowParentSettings(false)}
        onSave={handleProfileSave}
        currentProfile={childProfile}
      />
    </div>
  );
}