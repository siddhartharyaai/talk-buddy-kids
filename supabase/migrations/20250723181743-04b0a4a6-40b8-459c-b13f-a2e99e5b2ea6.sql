-- Create child profiles table
CREATE TABLE public.child_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  age_group TEXT NOT NULL CHECK (age_group IN ('3-5', '6-8', '9-12')),
  age_years INTEGER NOT NULL CHECK (age_years >= 3 AND age_years <= 12),
  gender TEXT NOT NULL CHECK (gender IN ('boy', 'girl', 'other')),
  interests TEXT[] DEFAULT '{}',
  learning_goals TEXT[] DEFAULT '{}',
  energy_level TEXT NOT NULL DEFAULT 'medium' CHECK (energy_level IN ('low', 'medium', 'high')),
  language TEXT[] NOT NULL DEFAULT '{english}' CHECK (array_length(language, 1) > 0),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable Row Level Security
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user access to their own child profiles
CREATE POLICY "Users can view their own child profile" 
ON public.child_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own child profile" 
ON public.child_profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own child profile" 
ON public.child_profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own child profile" 
ON public.child_profiles 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_child_profiles_updated_at
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();