import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const ConsentBanner = ({ onAccept, onDecline }: ConsentBannerProps) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg p-6 bg-white">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-800">
            👋 Hello Parent!
          </h2>
          
          <div className="space-y-3 text-gray-600">
            <p>
              Buddy is a safe voice companion for kids that can tell stories, 
              answer questions, and play educational games.
            </p>
            
            <p>
              <strong>Privacy Promise:</strong>
            </p>
            <ul className="text-sm space-y-1 text-left">
              <li>• Voice recordings are processed securely and not stored</li>
              <li>• No personal data is collected or shared</li>
              <li>• All conversations stay on your device</li>
              <li>• Content is age-appropriate and educational</li>
            </ul>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Microphone Access:</strong> Buddy needs microphone permission 
              to hear your child's voice and respond appropriately.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1"
            >
              Not Now
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
              I Agree - Set Up Buddy
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};