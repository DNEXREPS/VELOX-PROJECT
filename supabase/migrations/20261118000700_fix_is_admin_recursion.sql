-- Fix: is_admin() read `profiles` with the caller's rights, and the profiles read policy calls is_admin()
-- → infinite recursion ("stack depth limit exceeded") for every RLS-protected admin write by a signed-in
-- admin. SECURITY DEFINER (owner rights, fixed search_path) reads the caller's own role without
-- re-entering RLS. It only ever reports whether auth.uid() is an admin.
create or replace function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function is_admin() from public;
grant execute on function is_admin() to anon, authenticated, service_role;
