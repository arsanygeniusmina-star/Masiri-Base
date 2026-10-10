-- Add the dedicated role for the internal TEST account.
alter type public.user_role add value if not exists 'test';
