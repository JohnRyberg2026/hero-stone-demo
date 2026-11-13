-- Versioned private plans. Development/test only until retention controls exist.
create table public.health_quest_plan_versions (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 plan_id uuid not null, version integer not null check(version>0),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=20000),
 action_id uuid not null, created_at timestamptz not null default now(),
 primary key(owner_id,plan_id,version),unique(owner_id,action_id)
);
create table public.health_quest_plan_approvals (
 owner_id uuid not null,plan_id uuid not null,version integer not null,
 action_id uuid not null,approved_at timestamptz not null default now(),
 primary key(owner_id,plan_id,version),unique(owner_id,action_id),
 foreign key(owner_id,plan_id,version) references public.health_quest_plan_versions(owner_id,plan_id,version) on delete cascade
);
alter table public.health_quest_plan_versions enable row level security;
alter table public.health_quest_plan_approvals enable row level security;
revoke all on public.health_quest_plan_versions,public.health_quest_plan_approvals from public,anon,authenticated;
grant select,insert on public.health_quest_plan_versions,public.health_quest_plan_approvals to authenticated;
create policy plan_versions_owner on public.health_quest_plan_versions for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));
create policy plan_approvals_owner on public.health_quest_plan_approvals for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create function health_quest_internal.validate_plan_insert() returns trigger
language plpgsql security invoker set search_path='' as $$
declare latest integer;item jsonb;total_mg integer:=0;names text[]:=array['Moringa','Baobab','Jabuticaba','Flax','Chia','Hemp hearts','Pumpkin'];i integer:=0;
begin
 if auth.uid() is null or new.owner_id is distinct from auth.uid() then raise exception 'Expected plan owner' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.plan_id::text,0));
 select coalesce(max(version),0) into latest from public.health_quest_plan_versions where owner_id=auth.uid() and plan_id=new.plan_id;
 if new.version<>latest+1 then raise exception 'Plan changed; reload before proposing';end if;
 if jsonb_typeof(new.payload->'days') is distinct from 'number' or jsonb_typeof(new.payload->'daily') is distinct from 'number'
 or (new.payload->>'days')::numeric not between 1 and 90 or (new.payload->>'days')::numeric<>trunc((new.payload->>'days')::numeric)
 or (new.payload->>'daily')::numeric not between 1 and 3 or (new.payload->>'daily')::numeric<>trunc((new.payload->>'daily')::numeric)
 or jsonb_typeof(new.payload->'ingredients') is distinct from 'array' then raise exception 'Invalid sample plan';end if;
 if jsonb_array_length(new.payload->'ingredients')<>7 then raise exception 'Expected seven sample ingredients';end if;
 for item in select * from jsonb_array_elements(new.payload->'ingredients') loop
  i:=i+1;
  if jsonb_typeof(item) is distinct from 'array' then raise exception 'Invalid ingredient';end if;
  if jsonb_array_length(item)<>2 or item->>0 is distinct from names[i] or jsonb_typeof(item->1) is distinct from 'number' then raise exception 'Invalid ingredient';end if;
  if (item->>1)::numeric not between 0 and 20000 or (item->>1)::numeric<>trunc((item->>1)::numeric) then raise exception 'Invalid ingredient amount';end if;
  total_mg:=total_mg+(item->>1)::integer;
 end loop;
 if total_mg not between 100 and 50000 then raise exception 'Invalid serving mass';end if;
 new.created_at:=now();return new;
end;$$;
revoke all on function health_quest_internal.validate_plan_insert() from public,anon,authenticated;
create trigger validate_plan_insert before insert on public.health_quest_plan_versions for each row execute function health_quest_internal.validate_plan_insert();

create function health_quest_internal.validate_plan_approval() returns trigger
language plpgsql security invoker set search_path='' as $$
declare latest integer;
begin
 if auth.uid() is null or new.owner_id is distinct from auth.uid() then raise exception 'Expected plan owner' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.plan_id::text,0));
 select max(version) into latest from public.health_quest_plan_versions where owner_id=auth.uid() and plan_id=new.plan_id;
 if new.version is distinct from latest then raise exception 'Review the latest proposal before approval';end if;
 new.approved_at:=now();return new;
end;$$;
revoke all on function health_quest_internal.validate_plan_approval() from public,anon,authenticated;
create trigger validate_plan_approval before insert on public.health_quest_plan_approvals for each row execute function health_quest_internal.validate_plan_approval();

create function public.health_quest_propose_plan(p_expected_user uuid,p_plan_id uuid,p_expected_version integer,p_payload jsonb,p_action_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.health_quest_plan_versions%rowtype;result public.health_quest_plan_versions%rowtype;
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'Account changed' using errcode='42501';end if;
 if p_plan_id is null or p_expected_version is null or p_expected_version<0 or p_action_id is null then raise exception 'Invalid proposal action';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_plan_id::text,0));
 select * into existing from public.health_quest_plan_versions where owner_id=auth.uid() and action_id=p_action_id;
 if found then
  if existing.plan_id is distinct from p_plan_id or existing.version<>p_expected_version+1 or existing.payload is distinct from p_payload then raise exception 'Proposal action reused';end if;
  return to_jsonb(existing);
 end if;
 insert into public.health_quest_plan_versions(owner_id,plan_id,version,payload,action_id) values(auth.uid(),p_plan_id,p_expected_version+1,p_payload,p_action_id) returning * into result;
 return to_jsonb(result);
end;$$;
revoke all on function public.health_quest_propose_plan(uuid,uuid,integer,jsonb,uuid) from public,anon;
grant execute on function public.health_quest_propose_plan(uuid,uuid,integer,jsonb,uuid) to authenticated;

create function public.health_quest_approve_plan(p_expected_user uuid,p_plan_id uuid,p_version integer,p_action_id uuid,p_approved boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.health_quest_plan_approvals%rowtype;result public.health_quest_plan_approvals%rowtype;
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'Account changed' using errcode='42501';end if;
 if p_approved is distinct from true or p_plan_id is null or p_version is null or p_action_id is null then raise exception 'Explicit plan approval required';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_plan_id::text,0));
 select * into existing from public.health_quest_plan_approvals where owner_id=auth.uid() and action_id=p_action_id;
 if found then
  if existing.plan_id is distinct from p_plan_id or existing.version is distinct from p_version then raise exception 'Approval action reused';end if;
  return to_jsonb(existing);
 end if;
 insert into public.health_quest_plan_approvals(owner_id,plan_id,version,action_id) values(auth.uid(),p_plan_id,p_version,p_action_id) returning * into result;
 return to_jsonb(result);
end;$$;
revoke all on function public.health_quest_approve_plan(uuid,uuid,integer,uuid,boolean) from public,anon;
grant execute on function public.health_quest_approve_plan(uuid,uuid,integer,uuid,boolean) to authenticated;
