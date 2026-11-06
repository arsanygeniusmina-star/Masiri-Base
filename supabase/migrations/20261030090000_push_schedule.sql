-- Daily chapter push notifications (Cairo time):
--   08:00 → «إصحاح النهارده» + its verse, to everyone who hasn't read it yet
--   20:00 → reminder to those who still haven't read today (keep the 🔥)
-- Uses pg_cron + pg_net (built into Supabase). Safe to re-run.
-- Requires 20261030080000_push_notifications.sql first.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Calls the Edge Function "send-push" with the server-only secret.
create or replace function private.trigger_daily_push(p_slot text)
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform net.http_post(
    url := 'https://pduypklunvcsvabireuy.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select value from public.app_secrets where name = 'functions_jwt'), ''),
      'x-push-secret', (select value from public.app_secrets where name = 'push_cron_secret')
    ),
    body := jsonb_build_object('type', 'daily', 'slot', p_slot),
    timeout_milliseconds := 60000
  );
end;
$function$;

revoke all on function private.trigger_daily_push(text) from public, anon, authenticated;

-- Egypt is UTC+2 in winter (UTC+3 in summer): 06:00 / 18:00 UTC = 8 AM / 8 PM Cairo in winter.
select cron.schedule('apostles-daily-chapter-morning', '0 6 * * *', $$select private.trigger_daily_push('morning')$$);
select cron.schedule('apostles-daily-chapter-evening', '0 18 * * *', $$select private.trigger_daily_push('evening')$$);
