create table hs_invitation_internal.fit_profiles (
 user_id uuid primary key references auth.users(id) on delete cascade,
 profile jsonb not null default '{}'::jsonb,
 revision integer not null default 1,
 updated_at timestamptz not null default now()
);
alter table hs_invitation_internal.fit_profiles enable row level security;
create policy deny_direct_fit_access on hs_invitation_internal.fit_profiles for all to authenticated using(false) with check(false);
revoke all on hs_invitation_internal.fit_profiles from public,anon,authenticated;
create function hs_invitation_internal.own_fit_profile(p_expected_user uuid,p_action text default 'get',p_profile jsonb default null,p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.fit_profiles%rowtype; k text; val jsonb;
 allowed text[]:=array['units','sizeSystem','tops','bottoms','dresses','underwear','sleepwear','swimwear','shoeSystem','shoes','braSystem','braBand','braCup','height','weight','bust','underbust','waist','hips','inseam','fitNotes'];
begin
 if auth.uid() is null or p_expected_user is null or auth.uid()<>p_expected_user then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 if p_action is null or p_action not in('get','save','delete') then raise exception 'Unknown profile action';end if;
 -- Serialize creation, updates and deletion for this owner without exposing a target-user lookup.
 perform pg_advisory_xact_lock(hashtextextended('fit-profile:'||auth.uid()::text,0));
 select * into v from hs_invitation_internal.fit_profiles where user_id=auth.uid();
 if p_action='get' then return jsonb_build_object('profile',coalesce(v.profile,'{}'::jsonb),'revision',coalesce(v.revision,0));end if;
 if p_expected_revision is null or p_expected_revision<>coalesce(v.revision,0) then raise exception 'Your profile changed. Reopen it before saving';end if;
 if p_action='delete' then
  -- Keep a revision tombstone so a stale editor cannot recreate deleted measurements.
  insert into hs_invitation_internal.fit_profiles(user_id,profile,revision) values(auth.uid(),'{}',1)
  on conflict(user_id) do update set profile='{}',revision=fit_profiles.revision+1,updated_at=now();
 else
  if p_profile is null or jsonb_typeof(p_profile)<>'object' or octet_length(p_profile::text)>5000 then raise exception 'Invalid fit profile';end if;
  for k,val in select * from jsonb_each(p_profile) loop
   if not(k=any(allowed)) or jsonb_typeof(val)<>'string' or char_length(val#>>'{}')>160 then raise exception 'Invalid profile field';end if;
  end loop;
  if coalesce(p_profile->>'units','metric') not in('metric','imperial') then raise exception 'Choose measurement units';end if;
  insert into hs_invitation_internal.fit_profiles(user_id,profile,revision) values(auth.uid(),p_profile,1)
  on conflict(user_id) do update set profile=excluded.profile,revision=fit_profiles.revision+1,updated_at=now();
 end if;
 select * into v from hs_invitation_internal.fit_profiles where user_id=auth.uid();
 return jsonb_build_object('profile',v.profile,'revision',v.revision);
end;$$;
revoke all on function hs_invitation_internal.own_fit_profile(uuid,text,jsonb,integer) from public,anon;
grant execute on function hs_invitation_internal.own_fit_profile(uuid,text,jsonb,integer) to authenticated;
create function public.my_private_fit_profile(p_expected_user uuid,p_action text default 'get',p_profile jsonb default null,p_expected_revision integer default null)
returns jsonb language sql security invoker set search_path='' as $$select hs_invitation_internal.own_fit_profile(p_expected_user,p_action,p_profile,p_expected_revision);$$;
revoke all on function public.my_private_fit_profile(uuid,text,jsonb,integer) from public,anon;
grant execute on function public.my_private_fit_profile(uuid,text,jsonb,integer) to authenticated;
