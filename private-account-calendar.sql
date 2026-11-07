
create table public.hs_private_calendars (
 owner_id uuid primary key references auth.users(id) on delete cascade,
 calendar jsonb not null,
 revision integer not null default 1 check (revision > 0),
 updated_at timestamptz not null default now(),
 constraint hs_calendar_shape check (
   jsonb_typeof(calendar) = 'object' and calendar->'version' = '1'::jsonb
   and jsonb_typeof(calendar->'events') = 'array'
   and jsonb_typeof(calendar->'hearts') = 'array'
   and jsonb_array_length(calendar->'events') <= 200
   and jsonb_array_length(calendar->'hearts') <= 366
   and octet_length(calendar::text) <= 80000
 )
);
alter table public.hs_private_calendars enable row level security;
revoke all on public.hs_private_calendars from public, anon, authenticated;
grant select, insert, update on public.hs_private_calendars to authenticated;
create policy calendar_select_own on public.hs_private_calendars for select to authenticated using ((select auth.uid()) = owner_id);
create policy calendar_insert_own on public.hs_private_calendars for insert to authenticated with check ((select auth.uid()) = owner_id);
create policy calendar_update_own on public.hs_private_calendars for update to authenticated using ((select auth.uid()) = owner_id) with check ((select auth.uid()) = owner_id);

create function public.my_private_calendar(p_expected_user uuid, p_expected_revision integer default null, p_calendar jsonb default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 uid uuid := auth.uid();
 row_data public.hs_private_calendars%rowtype;
 e jsonb; h jsonb; value_day text; seen_ids text[] := '{}';
begin
 if uid is null or uid is distinct from p_expected_user then
   raise exception 'Your account changed. Reopen your calendar.' using errcode='42501';
 end if;
 if p_calendar is null then
   select * into row_data from public.hs_private_calendars where owner_id=uid;
   return jsonb_build_object('calendar',coalesce(row_data.calendar,'{"version":1,"events":[],"hearts":[]}'::jsonb),'revision',coalesce(row_data.revision,0));
 end if;
 if p_expected_revision is null or p_expected_revision < 0 then
   raise exception 'A calendar revision is required.' using errcode='22023';
 end if;
 if jsonb_typeof(p_calendar) is distinct from 'object'
    or p_calendar->'version' is distinct from '1'::jsonb
    or jsonb_typeof(p_calendar->'events') is distinct from 'array'
    or jsonb_typeof(p_calendar->'hearts') is distinct from 'array'
    or octet_length(p_calendar::text)>80000 then
   raise exception 'Invalid calendar.' using errcode='22023';
 end if;
 if jsonb_array_length(p_calendar->'events')>200 or jsonb_array_length(p_calendar->'hearts')>366 then
   raise exception 'Calendar capacity reached.' using errcode='22023';
 end if;
 for e in select value from jsonb_array_elements(p_calendar->'events') loop
   if jsonb_typeof(e) is distinct from 'object'
     or jsonb_typeof(e->'id') is distinct from 'string' or length(e->>'id') not between 1 and 80
     or jsonb_typeof(e->'title') is distinct from 'string' or length(btrim(e->>'title')) not between 1 and 120
     or jsonb_typeof(e->'kind') is distinct from 'string'
     or not (e->>'kind'=any(array['birthday','anniversary','holiday','tradition','milestone','reminder','wish','personal']))
     or jsonb_typeof(e->'day') is distinct from 'string'
     or (e->>'id')=any(seen_ids) then
     raise exception 'Invalid calendar entry.' using errcode='22023';
   end if;
   seen_ids:=array_append(seen_ids,e->>'id');
   value_day:=e->>'day';
   if value_day !~ '^[12][0-9]{3}-[0-9]{2}-[0-9]{2}$' or value_day<'1900-01-01' or value_day>'2199-12-31' then
     raise exception 'Invalid calendar date.' using errcode='22023';
   end if;
   perform value_day::date;
 end loop;
 for h in select value from jsonb_array_elements(p_calendar->'hearts') loop
   if jsonb_typeof(h) is distinct from 'string' then raise exception 'Invalid availability day.' using errcode='22023'; end if;
   value_day:=h#>>'{}';
   if value_day !~ '^[12][0-9]{3}-[0-9]{2}-[0-9]{2}$' or value_day<'1900-01-01' or value_day>'2199-12-31' then
     raise exception 'Invalid availability date.' using errcode='22023';
   end if;
   perform value_day::date;
 end loop;
 if p_expected_revision=0 then
   insert into public.hs_private_calendars(owner_id,calendar,revision)
   values(uid,p_calendar,1) on conflict(owner_id) do nothing returning * into row_data;
 else
   update public.hs_private_calendars set calendar=p_calendar,revision=revision+1,updated_at=now()
   where owner_id=uid and revision=p_expected_revision returning * into row_data;
 end if;
 if row_data.owner_id is null then
   raise exception 'This calendar changed on another device. Refresh before saving again.' using errcode='40001';
 end if;
 return jsonb_build_object('calendar',row_data.calendar,'revision',row_data.revision);
end;
$$;
revoke all on function public.my_private_calendar(uuid,integer,jsonb) from public,anon;
grant execute on function public.my_private_calendar(uuid,integer,jsonb) to authenticated;
