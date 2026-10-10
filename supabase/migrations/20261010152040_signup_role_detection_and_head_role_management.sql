-- Email role detection is a UI hint only; role assignment remains server-authoritative.
-- Protect the private allowlists and manage all elevated roles through head-only RPCs.
alter table private.head_accounts enable row level security;
alter table private.test_accounts enable row level security;

create or replace function public.detect_signup_role(p_email text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
begin
  if length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    return null;
  end if;

  if exists (select 1 from private.head_accounts h where h.email = normalized_email) then
    return 'head';
  end if;

  if exists (select 1 from private.test_accounts t where t.email = normalized_email) then
    return 'test';
  end if;

  if exists (
    select 1 from public.teachers_whitelist tw
    where lower(tw.email) = normalized_email
      and tw.status = 'active'
      and tw.assigned_grade is not null
  ) then
    return 'teacher';
  end if;

  return 'student';
end;
$function$;

revoke all on function public.detect_signup_role(text) from public;
grant execute on function public.detect_signup_role(text) to anon, authenticated;

create or replace function public.list_app_role_emails()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  accounts jsonb;
begin
  if coalesce((select private.current_app_role()), '') <> 'head' then
    raise exception 'Only a Head account can view role assignments' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'email', account.email,
        'name', account.name,
        'role', account.role,
        'assigned_grade', account.assigned_grade,
        'status', account.status,
        'created_at', account.created_at
      ) order by account.role, account.email
    ),
    '[]'::jsonb
  )
  into accounts
  from (
    select lower(tw.email) as email,
      tw.name,
      'teacher'::text as role,
      tw.assigned_grade::text as assigned_grade,
      coalesce(tw.status, 'inactive') as status,
      tw.created_at
    from public.teachers_whitelist tw
    union all
    select h.email,
      coalesce(u.name, split_part(h.email, '@', 1)) as name,
      'head'::text as role,
      null::text as assigned_grade,
      'active'::text as status,
      h.created_at
    from private.head_accounts h
    left join public.users u on lower(u.email) = h.email
    union all
    select t.email,
      coalesce(u.name, split_part(t.email, '@', 1)) as name,
      'test'::text as role,
      null::text as assigned_grade,
      'active'::text as status,
      t.created_at
    from private.test_accounts t
    left join public.users u on lower(u.email) = t.email
  ) account;

  return accounts;
end;
$function$;

revoke all on function public.list_app_role_emails() from public, anon, authenticated;
grant execute on function public.list_app_role_emails() to authenticated;

create or replace function public.manage_app_role_email(
  p_email text,
  p_role text,
  p_name text default null,
  p_grade text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  normalized_role text := lower(trim(coalesce(p_role, '')));
  normalized_name text := nullif(trim(coalesce(p_name, '')), '');
  resolved_grade public.middle_school_grade;
  actor_email text := lower(coalesce((select auth.jwt() ->> 'email'), ''));
begin
  if (select auth.uid()) is null
    or coalesce((select private.current_app_role()), '') <> 'head' then
    raise exception 'Only an authenticated Head account can add role assignments' using errcode = '42501';
  end if;

  if length(normalized_email) > 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'A valid email address is required' using errcode = '22023';
  end if;

  if normalized_role not in ('teacher', 'head', 'test') then
    raise exception 'Only teacher, head, or test role assignments can be managed here' using errcode = '22023';
  end if;

  if normalized_role = 'teacher' then
    if coalesce(p_grade, '') not in ('grade-1', 'grade-2', 'grade-3') then
      raise exception 'A teacher must be assigned to a grade' using errcode = '22023';
    end if;
    resolved_grade := p_grade::public.middle_school_grade;
  end if;

  if normalized_role <> 'head'
    and exists (select 1 from private.head_accounts h where h.email = normalized_email) then
    raise exception 'Email already assigned to another role' using errcode = '23505';
  end if;
  if normalized_role <> 'test'
    and exists (select 1 from private.test_accounts t where t.email = normalized_email) then
    raise exception 'Email already assigned to another role' using errcode = '23505';
  end if;
  if normalized_role <> 'teacher'
    and exists (select 1 from public.teachers_whitelist tw where lower(tw.email) = normalized_email) then
    raise exception 'Email already assigned to another role' using errcode = '23505';
  end if;

  if normalized_role = 'teacher' then
    if exists (select 1 from public.teachers_whitelist tw where lower(tw.email) = normalized_email) then
      update public.teachers_whitelist
        set email = normalized_email,
            name = coalesce(normalized_name, split_part(normalized_email, '@', 1)),
            assigned_grade = resolved_grade,
            added_by = actor_email,
            notes = 'تمت الإضافة أو التحديث من لوحة أمانة الخدمة',
            status = 'active'
      where lower(email) = normalized_email;
    else
      insert into public.teachers_whitelist
        (email, name, assigned_grade, added_by, notes, status)
      values
        (normalized_email, coalesce(normalized_name, split_part(normalized_email, '@', 1)),
         resolved_grade, actor_email, 'تمت الإضافة من لوحة أمانة الخدمة', 'active');
    end if;
  elsif normalized_role = 'head' then
    insert into private.head_accounts(email) values (normalized_email)
    on conflict (email) do nothing;
  else
    insert into private.test_accounts(email) values (normalized_email)
    on conflict (email) do nothing;
  end if;

  -- If this email already has a profile, apply the new role immediately.
  -- If not, the auth.users trigger will apply it when the person signs up.
  update public.users u
  set role = normalized_role::public.user_role,
      grade_level = case when normalized_role = 'teacher' then resolved_grade else null end
  where lower(u.email) = normalized_email;

  return jsonb_build_object(
    'email', normalized_email,
    'name', coalesce(normalized_name, split_part(normalized_email, '@', 1)),
    'role', normalized_role,
    'assigned_grade', resolved_grade,
    'status', 'active'
  );
end;
$function$;

revoke all on function public.manage_app_role_email(text, text, text, text) from public, anon, authenticated;
grant execute on function public.manage_app_role_email(text, text, text, text) to authenticated;
