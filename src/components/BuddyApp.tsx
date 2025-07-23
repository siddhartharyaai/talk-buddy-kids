import { useState, useEffect } from 'react';
import { Mic, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConsentBanner } from './ConsentBanner';
import { ParentSettingsModal, ChildProfile } from './ParentSettingsModal';
import { useToast } from '@/hooks/use-toast';

export const BuddyApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showConsent, setShowConsent] = useState(false);
  const [hasConsent, setHasConsent] = useState(false);
  const [childProfile, setChildProfile] = useState<ChildProfile | null>(null);
  const { toast } = useToast();

  // Load saved data on mount
  useEffect(() => {
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

  const handleMicPress = () => {
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
    // TODO: Implement actual recording in Step 3
  };

  const getWelcomeMessage = () => {
    if (!hasConsent) {
      return "Welcome! Please allow parent permission to get started.";
    }
    
    if (!childProfile) {
      return "Hi! Click the settings button to set up your child's profile.";
    }
    
    return `Hi ${childProfile.name}! I'm Buddy, your friendly voice companion. Press and hold the microphone to talk to me!`;
  };

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
          
          {/* Placeholder for future messages */}
          <div className="text-center text-gray-500 text-sm py-8">
            Your conversation will appear here...
          </div>
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
            onMouseUp={() => setIsRecording(false)}
            onTouchStart={handleMicPress}
            onTouchEnd={() => setIsRecording(false)}
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