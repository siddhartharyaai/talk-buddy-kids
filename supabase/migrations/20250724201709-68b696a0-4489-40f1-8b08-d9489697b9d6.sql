-- Ensure daily_telemetry column exists (it should already be there)
ALTER TABLE child_profiles 
ADD COLUMN IF NOT EXISTS daily_telemetry jsonb DEFAULT '{"date": "", "lastBreakTime": 0, "secondsSpoken": 0, "sessionsCount": 0, "lastUsageCheck": 0}'::jsonb;