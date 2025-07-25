-- Add avatar field to child_profiles table
ALTER TABLE public.child_profiles 
ADD COLUMN avatar text DEFAULT 'bunny' NOT NULL;

-- Add a constraint to ensure only valid avatar types
ALTER TABLE public.child_profiles 
ADD CONSTRAINT valid_avatar_type CHECK (avatar IN ('bunny', 'lion', 'puppy'));