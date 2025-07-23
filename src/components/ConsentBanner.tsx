import { Shield, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ConsentBannerProps {
  onConsent: (granted: boolean) => void;
}

export function ConsentBanner({ onConsent }: ConsentBannerProps) {
  return (
    <div className="bg-gradient-to-r from-buddy-orange to-buddy-yellow border-b border-border/50 p-4 shadow-soft">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg mb-2">
              Parent Consent Required
            </h3>
            <p className="text-white/90 text-sm leading-relaxed mb-4">
              This prototype records your child's voice when they hold the microphone button. 
              <strong> Nothing is stored on our servers yet.</strong> This is for local testing only. 
              Do you consent to voice recording for this session?
            </p>
            
            <div className="flex gap-3">
              <Button
                onClick={() => onConsent(true)}
                size="sm"
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                variant="outline"
              >
                <Check className="w-4 h-4 mr-2" />
                Yes, I Consent
              </Button>
              
              <Button
                onClick={() => onConsent(false)}
                size="sm"
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                <X className="w-4 h-4 mr-2" />
                No Thanks
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}