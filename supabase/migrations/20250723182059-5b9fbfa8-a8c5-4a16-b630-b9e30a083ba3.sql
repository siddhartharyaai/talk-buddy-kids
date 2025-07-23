-- Fix security warning: Update functions with proper search_path
-- First drop the trigger that depends on the function
DROP TRIGGER IF EXISTS update_child_profiles_updated_at ON public.child_profiles;

-- Drop and recreate the function with proper security settings
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER update_child_profiles_updated_at
  BEFORE UPDATE ON public.child_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Fix security warning: Update transcribe_audio function
DROP FUNCTION IF EXISTS public.transcribe_audio();

CREATE OR REPLACE FUNCTION public.transcribe_audio()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- This is a placeholder function for the edge function
    -- The actual transcription will be handled by the edge function
    RETURN 'transcription_placeholder';
END;
$$;