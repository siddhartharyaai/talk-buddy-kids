import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { getDefaultTimezone, minsUsedToday } from '../utils/usageTimers';
import { UsageRules, DailyTelemetry } from './BuddyApp';

export interface ChildProfile {
  name: string;
  ageGroup: '3-5' | '6-8' | '9-12';
  ageYears: number;
  gender: 'boy' | 'girl' | 'non-binary' | 'other';
  interests: string[];
  learningGoals: string[];
  energyLevel: 'low' | 'medium' | 'high';
  language: ('english' | 'hindi')[];
  usage_rules?: UsageRules;
  daily_telemetry?: DailyTelemetry;
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
  const [profile, setProfile] = useState<ChildProfile>(() => {
    if (initialProfile) return initialProfile;
    
    // Try to load from localStorage
    const saved = localStorage.getItem('buddyChildProfile');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn('Failed to parse saved profile');
      }
    }
    
    return {
      name: '',
      ageGroup: '6-8',
      ageYears: 7,
      gender: 'other',
      interests: [],
      learningGoals: [],
      energyLevel: 'medium',
      language: ['english']
    };
  });

  const handleSave = () => {
    if (profile.name.trim() && profile.language.length > 0) {
      // Store in localStorage
      localStorage.setItem('buddyChildProfile', JSON.stringify(profile));
      
      // Emit profile updated event
      window.dispatchEvent(new CustomEvent('profile:updated', { detail: profile }));
      
      onSave(profile);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <TooltipProvider>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white">
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-800">
              👨‍👩‍👧‍👦 Child Profile Setup
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

          {/* Tabbed Interface */}
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="profile">👶 Profile</TabsTrigger>
              <TabsTrigger value="health">🛡️ Healthy Use</TabsTrigger>
            </TabsList>
            
            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6">
              {/* Basic Information Section */}
              <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Basic Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  {/* Exact Age */}
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                        <SelectItem value="boy">Boy</SelectItem>
                        <SelectItem value="girl">Girl</SelectItem>
                        <SelectItem value="non-binary">Non-binary</SelectItem>
                        <SelectItem value="other">Other/Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Learning Preferences Section */}
              <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Learning Preferences
                </h3>
                
                {/* Interests */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Interests (select all that apply)
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-gray-400 hover:text-gray-600">ℹ️</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Select topics your child enjoys. Buddy will use these to make conversations more engaging and give examples from their favorite subjects.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm font-medium text-gray-700">
                      Learning Goals (select all that apply)
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help text-gray-400 hover:text-gray-600">ℹ️</span>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>Choose areas you'd like your child to develop. Buddy will tailor activities and questions to support these learning objectives.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {['Reading Skills', 'Math Concepts', 'Creative Thinking', 'Problem Solving', 'Language Learning', 'Social Skills', 'Daily Habits', 'Manners & Values'].map((goal) => (
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
              </div>

              {/* Personality & Language Section */}
              <div className="bg-gray-50 p-6 rounded-lg space-y-6">
                <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                  Personality & Language
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Energy Level */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label className="text-sm font-medium text-gray-700">
                        Energy Level
                      </Label>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help text-gray-400 hover:text-gray-600">ℹ️</span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p>This helps Buddy match your child's natural energy. High energy kids get more active suggestions, while calm kids get quieter activities.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
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

                  {/* Language Preference */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Languages (select all that apply)
                    </Label>
                    <div className="space-y-3">
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
                           🇺🇸 US English
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
                </div>
              </div>
            </TabsContent>

            {/* Healthy Use Tab */}
            <TabsContent value="health" className="space-y-6">
              <div className="bg-green-50 p-6 rounded-lg space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-2">
                    🛡️ Healthy Use Settings
                  </h3>
                  {profile.daily_telemetry && (
                    <Badge variant="secondary" className="ml-auto">
                      Today: {minsUsedToday(profile.daily_telemetry, profile.usage_rules?.timezone || getDefaultTimezone())} / {profile.usage_rules?.dailyLimitMin || 20} min
                    </Badge>
                  )}
                </div>
                
                {/* Daily Limit */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Daily Limit: {profile.usage_rules?.dailyLimitMin || 20} minutes
                  </Label>
                  <Slider
                    value={[profile.usage_rules?.dailyLimitMin || 20]}
                    onValueChange={(value) => setProfile({
                      ...profile,
                      usage_rules: {
                        ...profile.usage_rules,
                        timezone: profile.usage_rules?.timezone || getDefaultTimezone(),
                        dailyLimitMin: value[0],
                        breakIntervalMin: profile.usage_rules?.breakIntervalMin || 10,
                        bedtimeStart: profile.usage_rules?.bedtimeStart || "21:00",
                        bedtimeEnd: profile.usage_rules?.bedtimeEnd || "06:30"
                      }
                    })}
                    max={60}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Recommended: 15-30 minutes for healthy screen time</p>
                </div>

                {/* Break Interval */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    Break Reminder: Every {profile.usage_rules?.breakIntervalMin || 10} minutes
                  </Label>
                  <Slider
                    value={[profile.usage_rules?.breakIntervalMin || 10]}
                    onValueChange={(value) => setProfile({
                      ...profile,
                      usage_rules: {
                        ...profile.usage_rules,
                        timezone: profile.usage_rules?.timezone || getDefaultTimezone(),
                        dailyLimitMin: profile.usage_rules?.dailyLimitMin || 20,
                        breakIntervalMin: value[0],
                        bedtimeStart: profile.usage_rules?.bedtimeStart || "21:00",
                        bedtimeEnd: profile.usage_rules?.bedtimeEnd || "06:30"
                      }
                    })}
                    max={30}
                    min={5}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Regular breaks help prevent eye strain and encourage movement</p>
                </div>

                {/* Bedtime Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Bedtime Start
                    </Label>
                    <Input
                      type="time"
                      value={profile.usage_rules?.bedtimeStart || "21:00"}
                      onChange={(e) => setProfile({
                        ...profile,
                        usage_rules: {
                          ...profile.usage_rules,
                          timezone: profile.usage_rules?.timezone || getDefaultTimezone(),
                          dailyLimitMin: profile.usage_rules?.dailyLimitMin || 20,
                          breakIntervalMin: profile.usage_rules?.breakIntervalMin || 10,
                          bedtimeStart: e.target.value,
                          bedtimeEnd: profile.usage_rules?.bedtimeEnd || "06:30"
                        }
                      })}
                      className="w-full"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Wake Up Time
                    </Label>
                    <Input
                      type="time"
                      value={profile.usage_rules?.bedtimeEnd || "06:30"}
                      onChange={(e) => setProfile({
                        ...profile,
                        usage_rules: {
                          ...profile.usage_rules,
                          timezone: profile.usage_rules?.timezone || getDefaultTimezone(),
                          dailyLimitMin: profile.usage_rules?.dailyLimitMin || 20,
                          breakIntervalMin: profile.usage_rules?.breakIntervalMin || 10,
                          bedtimeStart: profile.usage_rules?.bedtimeStart || "21:00",
                          bedtimeEnd: e.target.value
                        }
                      })}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* City/Timezone */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium text-gray-700">
                    City (optional - for accurate bedtime)
                  </Label>
                  <Input
                    type="text"
                    value={profile.usage_rules?.city || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      usage_rules: {
                        ...profile.usage_rules,
                        timezone: profile.usage_rules?.timezone || getDefaultTimezone(),
                        dailyLimitMin: profile.usage_rules?.dailyLimitMin || 20,
                        breakIntervalMin: profile.usage_rules?.breakIntervalMin || 10,
                        bedtimeStart: profile.usage_rules?.bedtimeStart || "21:00",
                        bedtimeEnd: profile.usage_rules?.bedtimeEnd || "06:30",
                        city: e.target.value
                      }
                    })}
                    placeholder="e.g., New York, Mumbai, London"
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500">Timezone: {profile.usage_rules?.timezone || getDefaultTimezone()}</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">🎯 Healthy Use Features</h4>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Daily usage tracking and limits</li>
                    <li>• Regular break reminders with stretch suggestions</li>
                    <li>• Bedtime enforcement with soothing goodnight stories</li>
                    <li>• Automatic mic pause during bedtime hours</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 bg-white sticky bottom-0 border-t border-gray-200 py-4">
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
    </TooltipProvider>
  );
};