-- Update child_profiles table to use proper auth users
ALTER TABLE public.child_profiles 
DROP CONSTRAINT IF EXISTS child_profiles_user_id_fkey;

-- Add proper foreign key reference to auth.users
ALTER TABLE public.child_profiles 
ADD CONSTRAINT child_profiles_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Re-enable RLS with proper auth-based policies
ALTER TABLE public.child_profiles ENABLE ROW LEVEL SECURITY;

-- Drop the generic policy
DROP POLICY IF EXISTS "Allow access to own device profile" ON public.child_profiles;

-- Create proper auth-based policies
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