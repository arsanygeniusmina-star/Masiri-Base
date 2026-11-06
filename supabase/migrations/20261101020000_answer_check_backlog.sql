-- Every 5 minutes: check any «شوفت ربنا فين» answer from the last 7 days that was never
-- checked by the AI (e.g. the app closed right after «تمت القراءة») or whose check failed.
-- Requires 20261030090000_push_schedule.sql (pg_cron, pg_net, app_secrets). Safe to re-run.

create or replace function private.trigger_answer_backlog()
returns void
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform net.http_post(
    url := 'https://pduypklunvcsvabireuy.supabase.co/functions/v1/check-answer',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select value from public.app_secrets where name = 'functions_jwt'), ''),
      'x-push-secret', (select value from public.app_secrets where name = 'push_cron_secret')
    ),
    body := jsonb_build_object('type', 'backlog'),
    timeout_milliseconds := 120000
  );
end;
$function$;

revoke all on function private.trigger_answer_backlog() from public, anon, authenticated;

select cron.schedule('apostles-answer-check-backlog', '*/5 * * * *', $$select private.trigger_answer_backlog()$$);
