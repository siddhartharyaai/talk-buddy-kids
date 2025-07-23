import { useState } from 'react';
import { Mic, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export const BuddyApp = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

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
            <p className="text-sm text-gray-600">Kids Voice Companion</p>
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
                  Hi there! I'm Buddy, your friendly voice companion. 
                  Press and hold the microphone to talk to me!
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
            `}
            onMouseDown={() => setIsRecording(true)}
            onMouseUp={() => setIsRecording(false)}
            onTouchStart={() => setIsRecording(true)}
            onTouchEnd={() => setIsRecording(false)}
          >
            <Mic className="w-8 h-8 text-white" />
          </Button>
        </div>
        
        {/* Hint Text */}
        <p className="text-center text-gray-600 text-sm mt-4">
          {isRecording ? "🎤 Listening... Release to stop" : "Hold to speak"}
        </p>
      </div>

      {/* Settings Modal Placeholder */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Parent Settings</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
                className="p-1"
              >
                ✕
              </Button>
            </div>
            <p className="text-gray-600 text-center py-8">
              Settings modal will be implemented in Step 2
            </p>
          </Card>
        </div>
      )}
    </div>
  );
};