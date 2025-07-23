import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Shield, Heart, Lock } from 'lucide-react';

interface ConsentBannerProps {
  onAccept: () => void;
  onDecline: () => void;
}

export const ConsentBanner = ({ onAccept, onDecline }: ConsentBannerProps) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg p-6 bg-white">
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Shield className="w-8 h-8 text-green-600" />
              <h2 className="text-2xl font-bold text-gray-800">
                Welcome to Buddy!
              </h2>
            </div>
            <p className="text-gray-600">Your child's safe AI learning companion</p>
          </div>

          {/* Privacy Assurance */}
          <Card className="border-green-200 bg-green-50 p-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-green-600" />
                <h3 className="font-semibold text-green-800">🔒 Your Privacy is Protected</h3>
              </div>
              <ul className="space-y-2 text-sm text-green-800">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>No conversations saved:</strong> Chats are not stored or recorded</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Encrypted profiles:</strong> Child data is securely encrypted</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>No tracking:</strong> We don't share data with third parties</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span><strong>Family safe:</strong> COPPA compliant and designed for kids</span>
                </li>
              </ul>
            </div>
          </Card>

          {/* Parent Commitment */}
          <Card className="border-blue-200 bg-blue-50 p-4">
            <div className="flex items-start gap-3">
              <Heart className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 text-sm text-blue-800">
                <p className="font-medium">Parent Guidelines:</p>
                <ul className="space-y-1 text-xs">
                  <li>• This is an AI assistant for educational purposes</li>
                  <li>• Please supervise your child's interactions</li>
                  <li>• Buddy cannot replace human judgment or supervision</li>
                  <li>• Report any concerns through your account settings</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onDecline}
              variant="outline"
              className="flex-1"
            >
              Not Now
            </Button>
            <Button
              onClick={onAccept}
              className="flex-1 bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700"
            >
              I Agree - Continue
            </Button>
          </div>

          <div className="text-center text-xs text-gray-500">
            By continuing, you agree to supervise your child's use and understand this is an AI educational tool.
          </div>
        </div>
      </Card>
    </div>
  );
};