-- Dedicated Health Quest Test project only. Never apply to existing Heartstone.
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade
);
alter table public.profiles enable row level security;
revoke all on public.profiles from public,anon,authenticated;
grant select,insert on public.profiles to authenticated;
create policy test_profile_owner_read on public.profiles for select to authenticated
 using(id=(select auth.uid()));
create policy test_profile_owner_create on public.profiles for insert to authenticated
 with check(id=(select auth.uid()));
