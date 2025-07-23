import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChildProfile } from './BuddyApp';

interface ParentSettingsModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (profile: ChildProfile) => void;
  currentProfile: ChildProfile;
}

export function ParentSettingsModal({ 
  open, 
  onClose, 
  onSave, 
  currentProfile 
}: ParentSettingsModalProps) {
  const [formData, setFormData] = useState<ChildProfile>(currentProfile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setFormData(currentProfile);
      setErrors({});
    }
  }, [open, currentProfile]);
  
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = "Child's name is required";
    }
    
    if (!formData.age_band) {
      newErrors.age_band = "Please select an age range";
    }
    
    if (!formData.lang) {
      newErrors.lang = "Please select a language";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleSave = () => {
    if (validateForm()) {
      onSave(formData);
    }
  };
  
  const handleCancel = () => {
    setFormData(currentProfile);
    setErrors({});
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center mb-2">
            Parent Settings
          </DialogTitle>
          <p className="text-muted-foreground text-center">
            Configure your child's profile for a personalized experience
          </p>
        </DialogHeader>
        
        <div className="space-y-6 pt-4">
          {/* Child Name */}
          <div className="space-y-2">
            <Label htmlFor="child-name" className="text-base font-medium">
              Child's Name
            </Label>
            <Input
              id="child-name"
              placeholder="Enter your child's name"
              value={formData.name || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className={errors.name ? 'border-destructive' : ''}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          
          {/* Age Band */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Age Range</Label>
            <Select
              value={formData.age_band || ''}
              onValueChange={(value: "3-5" | "6-8" | "9-12") => 
                setFormData(prev => ({ ...prev, age_band: value }))
              }
            >
              <SelectTrigger className={errors.age_band ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select age range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3-5">3-5 years old</SelectItem>
                <SelectItem value="6-8">6-8 years old</SelectItem>
                <SelectItem value="9-12">9-12 years old</SelectItem>
              </SelectContent>
            </Select>
            {errors.age_band && (
              <p className="text-sm text-destructive">{errors.age_band}</p>
            )}
          </div>
          
          {/* Language */}
          <div className="space-y-2">
            <Label className="text-base font-medium">Primary Language</Label>
            <Select
              value={formData.lang || ''}
              onValueChange={(value: string) => 
                setFormData(prev => ({ ...prev, lang: value }))
              }
            >
              <SelectTrigger className={errors.lang ? 'border-destructive' : ''}>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="english">English</SelectItem>
                <SelectItem value="hindi">Hindi</SelectItem>
                <SelectItem value="tamil">Tamil</SelectItem>
                <SelectItem value="bengali">Bengali</SelectItem>
              </SelectContent>
            </Select>
            {errors.lang && (
              <p className="text-sm text-destructive">{errors.lang}</p>
            )}
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex gap-3 pt-6">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="flex-1 bg-buddy-gradient hover:opacity-90"
          >
            Save Profile
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}