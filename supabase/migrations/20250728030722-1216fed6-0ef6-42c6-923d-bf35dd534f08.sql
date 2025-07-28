-- Schedule nightly memory consolidation cron job
SELECT cron.schedule(
  'consolidate-memory-nightly',
  '0 2 * * *', -- 2 AM daily
  $$
  SELECT
    net.http_post(
        url:='https://bcqfogudctmltxvwluyb.supabase.co/functions/v1/consolidate-memory',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJjcWZvZ3VkY3RtbHR4dndsdXliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMyNjE5MTEsImV4cCI6MjA2ODgzNzkxMX0.nDGk2UFkc09JE---X494VaQMFMn-ezXrJDR6TGMKYQY"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);