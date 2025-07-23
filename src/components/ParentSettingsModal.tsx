import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

export interface ChildProfile {
  name: string;
  ageGroup: '3-5' | '6-8' | '9-12';
  language: 'english' | 'hindi';
}

interface ParentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: ChildProfile) => void;
  initialProfile?: ChildProfile;
}

export const ParentSettingsModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialProfile 
}: ParentSettingsModalProps) => {
  const [profile, setProfile] = useState<ChildProfile>(
    initialProfile || {
      name: '',
      ageGroup: '6-8',
      language: 'english'
    }
  );

  const handleSave = () => {
    if (profile.name.trim()) {
      onSave(profile);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6 bg-white">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">
              👨‍👩‍👧‍👦 Child Settings
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              ✕
            </Button>
          </div>

          {/* Child Name */}
          <div className="space-y-2">
            <Label htmlFor="childName" className="text-sm font-medium text-gray-700">
              Child's Name
            </Label>
            <Input
              id="childName"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              placeholder="Enter your child's name"
              className="w-full"
            />
          </div>

          {/* Age Group */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Age Group
            </Label>
            <RadioGroup
              value={profile.ageGroup}
              onValueChange={(value) => setProfile({ ...profile, ageGroup: value as ChildProfile['ageGroup'] })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="3-5" id="age-3-5" />
                <Label htmlFor="age-3-5" className="text-sm cursor-pointer">
                  3-5 years (Preschool)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="6-8" id="age-6-8" />
                <Label htmlFor="age-6-8" className="text-sm cursor-pointer">
                  6-8 years (Early Elementary)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="9-12" id="age-9-12" />
                <Label htmlFor="age-9-12" className="text-sm cursor-pointer">
                  9-12 years (Elementary)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Language Preference */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Primary Language
            </Label>
            <RadioGroup
              value={profile.language}
              onValueChange={(value) => setProfile({ ...profile, language: value as ChildProfile['language'] })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="english" id="lang-english" />
                <Label htmlFor="lang-english" className="text-sm cursor-pointer">
                  🇺🇸 English
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="hindi" id="lang-hindi" />
                <Label htmlFor="lang-hindi" className="text-sm cursor-pointer">
                  🇮🇳 Hindi (हिंदी)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!profile.name.trim()}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50"
            >
              Save Settings
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};