-- Schedule nightly memory consolidation cron job
SELECT cron.schedule(
  'consolidate-memory-nightly',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://dxmnxkgpnxfvxznhvkzv.supabase.co/functions/v1/consolidate-memory',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4bW54a2dwbnhmdnh6bmh2a3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5OTI3MzEsImV4cCI6MjA1MzU2ODczMX0.JHTMrOMQyZsKdQKWiNQQe3w8VzVBKSBKr-wpUJ4qZrw"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);