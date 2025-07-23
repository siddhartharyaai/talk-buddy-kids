-- Fix security warning: Set search_path for update_updated_at_column function
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

-- Fix security warning: Set search_path for transcribe_audio function  
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