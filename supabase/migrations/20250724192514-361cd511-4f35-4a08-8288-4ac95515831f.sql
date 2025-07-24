-- Add usage rules and telemetry to child_profiles table
ALTER TABLE public.child_profiles 
ADD COLUMN usage_rules JSONB DEFAULT '{
  "timezone": "UTC",
  "city": null,
  "dailyLimitMin": 20,
  "breakIntervalMin": 10,
  "bedtimeStart": "21:00",
  "bedtimeEnd": "06:30"
}'::jsonb,
ADD COLUMN daily_telemetry JSONB DEFAULT '{
  "date": "",
  "secondsSpoken": 0,
  "sessionsCount": 0,
  "lastBreakTime": 0,
  "lastUsageCheck": 0
}'::jsonb;