-- Temporarily disable RLS to allow device-based access without authentication
ALTER TABLE public.child_profiles DISABLE ROW LEVEL SECURITY;

-- Note: In production, you might want to implement a more sophisticated security model
-- such as API keys or signed requests, but for this demo app, we'll use device IDs