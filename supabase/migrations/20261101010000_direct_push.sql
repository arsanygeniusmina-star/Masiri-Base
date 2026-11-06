-- Send a push notification to ONE person (run in the SQL Editor).
--   select private.send_push_to('email@example.com', 'العنوان', 'الرسالة', '/');
-- Shortcut that opens the permissions screen (camera + notifications):
--   select private.ask_permissions('email@example.com');
-- Requires 20261030090000_push_schedule.sql (pg_net + app_secrets).

create or replace function private.send_push_to(p_email text, p_title text, p_message text, p_url text default '/')
returns bigint
language plpgsql
security definer
set search_path = ''
as $function$
begin
  return net.http_post(
    url := 'https://pduypklunvcsvabireuy.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce((select value from public.app_secrets where name = 'functions_jwt'), ''),
      'x-push-secret', (select value from public.app_secrets where name = 'push_cron_secret')
    ),
    body := jsonb_build_object('type', 'direct', 'email', p_email, 'title', p_title, 'message', p_message, 'url', p_url),
    timeout_milliseconds := 30000
  );
end;
$function$;

create or replace function private.ask_permissions(p_email text)
returns bigint
language sql
security definer
set search_path = ''
as $function$
  select private.send_push_to(
    p_email,
    '📷 محتاجين إذن الكاميرا',
    'دوس هنا وبعدين «سماح» عشان تقدر تصور بعد القراءة ويتحسب الـ 🔥',
    '/?permissions=1'
  )
$function$;

revoke all on function private.send_push_to(text, text, text, text) from public, anon, authenticated;
revoke all on function private.ask_permissions(text) from public, anon, authenticated;
