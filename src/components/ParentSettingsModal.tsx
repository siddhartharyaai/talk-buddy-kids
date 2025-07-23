import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ChildProfile {
  name: string;
  ageGroup: '3-5' | '6-8' | '9-12';
  ageYears: number;
  gender: 'male' | 'female' | 'other';
  interests: string[];
  learningGoals: string[];
  energyLevel: 'low' | 'medium' | 'high';
  language: ('english' | 'hindi')[];
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
      ageYears: 7,
      gender: 'other',
      interests: [],
      learningGoals: [],
      energyLevel: 'medium',
      language: ['english']
    }
  );

  const handleSave = () => {
    if (profile.name.trim() && profile.language.length > 0) {
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

          {/* Age in Years */}
          <div className="space-y-2">
            <Label htmlFor="ageYears" className="text-sm font-medium text-gray-700">
              Exact Age (years)
            </Label>
            <Input
              id="ageYears"
              type="number"
              min="3"
              max="12"
              value={profile.ageYears}
              onChange={(e) => setProfile({ ...profile, ageYears: parseInt(e.target.value) || 3 })}
              className="w-full"
            />
          </div>

          {/* Gender */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Gender
            </Label>
            <Select value={profile.gender} onValueChange={(value) => setProfile({ ...profile, gender: value as ChildProfile['gender'] })}>
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Boy</SelectItem>
                <SelectItem value="female">Girl</SelectItem>
                <SelectItem value="other">Other/Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Interests */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Interests (select all that apply)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {['Animals', 'Science', 'Art', 'Music', 'Sports', 'Stories', 'Games', 'Nature'].map((interest) => (
                <div key={interest} className="flex items-center space-x-2">
                  <Checkbox
                    id={`interest-${interest}`}
                    checked={profile.interests.includes(interest)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setProfile({ ...profile, interests: [...profile.interests, interest] });
                      } else {
                        setProfile({ ...profile, interests: profile.interests.filter(i => i !== interest) });
                      }
                    }}
                  />
                  <Label htmlFor={`interest-${interest}`} className="text-sm cursor-pointer">
                    {interest}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Learning Goals */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Learning Goals (select all that apply)
            </Label>
            <div className="grid grid-cols-1 gap-2">
              {['Reading Skills', 'Math Concepts', 'Creative Thinking', 'Problem Solving', 'Language Learning', 'Social Skills'].map((goal) => (
                <div key={goal} className="flex items-center space-x-2">
                  <Checkbox
                    id={`goal-${goal}`}
                    checked={profile.learningGoals.includes(goal)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setProfile({ ...profile, learningGoals: [...profile.learningGoals, goal] });
                      } else {
                        setProfile({ ...profile, learningGoals: profile.learningGoals.filter(g => g !== goal) });
                      }
                    }}
                  />
                  <Label htmlFor={`goal-${goal}`} className="text-sm cursor-pointer">
                    {goal}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Energy Level */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Energy Level
            </Label>
            <RadioGroup
              value={profile.energyLevel}
              onValueChange={(value) => setProfile({ ...profile, energyLevel: value as ChildProfile['energyLevel'] })}
              className="space-y-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="energy-low" />
                <Label htmlFor="energy-low" className="text-sm cursor-pointer">
                  😌 Calm & Quiet
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="energy-medium" />
                <Label htmlFor="energy-medium" className="text-sm cursor-pointer">
                  😊 Balanced
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="energy-high" />
                <Label htmlFor="energy-high" className="text-sm cursor-pointer">
                  🚀 High Energy & Active
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Language Preference - Now Multi-Select */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-gray-700">
              Languages (select all that apply)
            </Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lang-english"
                  checked={profile.language.includes('english')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setProfile({ ...profile, language: [...profile.language, 'english'] });
                    } else {
                      setProfile({ ...profile, language: profile.language.filter(l => l !== 'english') });
                    }
                  }}
                />
                <Label htmlFor="lang-english" className="text-sm cursor-pointer">
                  🇺🇸 English
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="lang-hindi"
                  checked={profile.language.includes('hindi')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setProfile({ ...profile, language: [...profile.language, 'hindi'] });
                    } else {
                      setProfile({ ...profile, language: profile.language.filter(l => l !== 'hindi') });
                    }
                  }}
                />
                <Label htmlFor="lang-hindi" className="text-sm cursor-pointer">
                  🇮🇳 Hindi (हिंदी)
                </Label>
              </div>
            </div>
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
              disabled={!profile.name.trim() || profile.language.length === 0}
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