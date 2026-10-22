-- Reviewable installation script. Existing pair invitations are unchanged.
-- Run as database owner in one transaction. No browser confirmation enrolls adults.
create schema hs_shared_dates;
revoke all on schema hs_shared_dates from public,anon,authenticated;
grant usage on schema hs_shared_dates to authenticated,service_role;

create table hs_shared_dates.verified_adults (
 user_id uuid primary key references auth.users(id) on delete cascade,
 verified_at timestamptz not null,
 expires_at timestamptz not null,
 revoked_at timestamptz,
 check(expires_at>verified_at)
);
alter table hs_shared_dates.verified_adults enable row level security;
revoke all on hs_shared_dates.verified_adults from public,anon,authenticated;
grant select,insert,update,delete on hs_shared_dates.verified_adults to service_role;

create table hs_shared_dates.dates (
 id uuid primary key default gen_random_uuid(),
 organizer uuid not null references auth.users(id),
 revision integer not null default 1 check(revision>0),
 title text not null check(char_length(btrim(title)) between 1 and 120),
 when_text text not null check(char_length(btrim(when_text)) between 1 and 300),
 meeting text not null check(char_length(btrim(meeting)) between 1 and 500),
 state text not null default 'draft' check(state in ('draft','pending','confirmed','closed','needs_revision','started','stopped')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index shared_date_organizer on hs_shared_dates.dates(organizer,updated_at desc);
create table hs_shared_dates.participants (
 date_id uuid not null references hs_shared_dates.dates(id) on delete cascade,
 revision integer not null,
 user_id uuid not null references auth.users(id),
 response text not null default 'pending' check(response in ('pending','accepted','declined','reschedule','withdrawn')),
 responded_at timestamptz,
 primary key(date_id,revision,user_id)
);
create index shared_date_participant_user on hs_shared_dates.participants(user_id,date_id,revision);
create table hs_shared_dates.requests (
 actor uuid not null references auth.users(id),
 request_id uuid not null,
 operation text not null,
 date_id uuid not null references hs_shared_dates.dates(id),
 expected_revision integer,
 payload jsonb not null,
 primary key(actor,request_id)
);
create index shared_date_request_date on hs_shared_dates.requests(date_id);
alter table hs_shared_dates.dates enable row level security;
alter table hs_shared_dates.participants enable row level security;
alter table hs_shared_dates.requests enable row level security;
revoke all on all tables in schema hs_shared_dates from public,anon,authenticated;

-- Called only inside the authenticated operation below. Row locks serialize
-- age-proof revocation with positive consent and beginning a shared date.
create function hs_shared_dates.require_adults(p_users uuid[])
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from hs_shared_dates.verified_adults where user_id=any(p_users) order by user_id for share;
 if exists(select 1 from unnest(p_users) u where not exists(
  select 1 from hs_shared_dates.verified_adults v join public.profiles f on f.id=v.user_id where v.user_id=u and f.account_status='active' and v.verified_at<=now() and v.expires_at>now() and v.revoked_at is null
 )) then raise exception 'Every included person needs current verified adult eligibility' using errcode='42501';end if;
end;$$;

create function hs_shared_dates.require_roster(p_users uuid[],p_organizer uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if p_users is null or cardinality(p_users) not between 2 and 20 or array_position(p_users,null) is not null
 or (select count(distinct u) from unnest(p_users) u)<>cardinality(p_users)
 or not p_organizer=any(p_users) then raise exception 'Choose 2 to 20 distinct participants, including yourself';end if;
 perform hs_shared_dates.require_adults(p_users);
 -- Hold membership rows while validating and writing this operation.
 perform 1 from public.heart_stone_memberships where user_id=any(p_users) and status='active' order by user_id,heart_stone_id for share;
 if exists(select 1 from unnest(p_users) u where u<>p_organizer and not exists(
  select 1 from public.heart_stone_memberships a join public.heart_stone_memberships b on b.heart_stone_id=a.heart_stone_id
  where a.user_id=p_organizer and b.user_id=u and a.status='active' and b.status='active'
 )) then raise exception 'Every invitee needs an active connection with the organizer' using errcode='42501';end if;
end;$$;

create function hs_shared_dates.snapshot(p_date uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d hs_shared_dates.dates%rowtype;
begin
 select * into d from hs_shared_dates.dates where id=p_date;
 if not found or not exists(select 1 from hs_shared_dates.participants where date_id=d.id and revision=d.revision and user_id=p_actor)
 or (d.state='draft' and d.organizer<>p_actor) then raise exception 'Shared date unavailable' using errcode='42501';end if;
 -- A revoked/expired user may still withdraw or stop; do not disclose the plan.
 if (p_actor<>d.organizer and not exists(select 1 from public.heart_stone_memberships a join public.heart_stone_memberships b on b.heart_stone_id=a.heart_stone_id where a.user_id=d.organizer and b.user_id=p_actor and a.status='active' and b.status='active')) or not exists(select 1 from hs_shared_dates.verified_adults v join public.profiles f on f.id=v.user_id where v.user_id=p_actor and f.account_status='active' and v.revoked_at is null and v.verified_at<=now() and v.expires_at>now()) then
  return jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state,'eligibility_required',true);
 end if;
 return jsonb_build_object('id',d.id,'organizer',d.organizer,'revision',d.revision,'title',d.title,'when',d.when_text,'meeting',d.meeting,'state',d.state,
 'participants',(select jsonb_agg(jsonb_build_object('id',p.user_id,'name',coalesce(nullif(btrim(f.first_name),''),'Participant'),'response',p.response) order by p.user_id)
 from hs_shared_dates.participants p left join public.profiles f on f.id=p.user_id where p.date_id=d.id and p.revision=d.revision));
end;$$;

-- This is the only privileged boundary. actor always comes from auth.uid().
create function hs_shared_dates.action(p_operation text,p_expected_user uuid,p_date_id uuid,p_expected_revision integer,p_payload jsonb,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();d hs_shared_dates.dates%rowtype;r hs_shared_dates.requests%rowtype;
 users uuid[];own_response text;answer text;outcome jsonb;requested_payload jsonb:=coalesce(p_payload,'{}'::jsonb);
begin
 if v_actor is null or p_expected_user is distinct from v_actor then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 if p_operation is null or p_operation not in ('create','view','list','send','respond','revise','begin','stop') then raise exception 'Unknown shared-date operation';end if;
 if jsonb_typeof(requested_payload)<>'object' or octet_length(requested_payload::text)>12000 then raise exception 'Invalid shared-date payload';end if;
 if p_operation in ('view','list','send','begin','stop') and requested_payload<>'{}'::jsonb then raise exception 'This operation takes no plan fields';end if;
 if p_operation='list' then
  perform hs_shared_dates.require_adults(array[v_actor]);
  return coalesce((select jsonb_agg(hs_shared_dates.snapshot(q.id,v_actor) order by q.updated_at desc,q.id) from (
   select x.id,x.updated_at from hs_shared_dates.dates x where exists(select 1 from hs_shared_dates.participants p where p.date_id=x.id and p.revision=x.revision and p.user_id=v_actor)
   and (x.state<>'draft' or x.organizer=v_actor) order by x.updated_at desc,x.id limit 50
  ) q),'[]'::jsonb);
 end if;
 if p_operation='view' then
  perform 1 from hs_shared_dates.dates where id=p_date_id for share;
  return hs_shared_dates.snapshot(p_date_id,v_actor);
 end if;
 if p_request_id is null then raise exception 'A retry-safe request identity is required';end if;
 perform pg_advisory_xact_lock(hashtextextended(v_actor::text||p_request_id::text,0));
 select * into r from hs_shared_dates.requests where requests.actor=v_actor and request_id=p_request_id;
 if found then
  if (r.operation,r.expected_revision,r.payload) is distinct from (p_operation,p_expected_revision,requested_payload)
  or (p_operation<>'create' and r.date_id is distinct from p_date_id) then raise exception 'Request identity belongs to a different operation';end if;
  perform 1 from hs_shared_dates.dates where id=r.date_id for share;
  return hs_shared_dates.snapshot(r.date_id,v_actor);
 end if;
 if p_operation in ('create','revise') then
  if (select count(*) from jsonb_object_keys(requested_payload))<>4 or not(requested_payload ?& array['participants','title','when','meeting'])
  or jsonb_typeof(requested_payload->'participants')<>'array' then raise exception 'Provide only participants, title, when and meeting';end if;
  if exists(select 1 from jsonb_array_elements(requested_payload->'participants') v where jsonb_typeof(v)<>'string') then raise exception 'Participant identities must be strings';end if;
  select array_agg(v::uuid order by v::uuid) into users from jsonb_array_elements_text(requested_payload->'participants') v;
  if exists(select 1 from unnest(array['title','when','meeting']) k where jsonb_typeof(requested_payload->k)<>'string') then raise exception 'Plan fields must be text';end if;
 end if;
 if p_operation='create' then
  if p_date_id is not null or p_expected_revision is not null then raise exception 'A new date has no existing identity or revision';end if;
  perform hs_shared_dates.require_roster(users,v_actor);
  insert into hs_shared_dates.dates(organizer,title,when_text,meeting) values(v_actor,btrim(requested_payload->>'title'),btrim(requested_payload->>'when'),btrim(requested_payload->>'meeting')) returning * into d;
  insert into hs_shared_dates.participants(date_id,revision,user_id) select d.id,d.revision,u from unnest(users) u;
 else
  select * into d from hs_shared_dates.dates where id=p_date_id for update;
  if not found or not exists(select 1 from hs_shared_dates.participants where date_id=d.id and revision=d.revision and user_id=v_actor)
  or (d.state='draft' and d.organizer<>v_actor) then raise exception 'Shared date unavailable' using errcode='42501';end if;
  if p_expected_revision is distinct from d.revision then raise exception 'This date changed. Review the current invitation';end if;
  if p_operation='revise' then
   if d.organizer<>v_actor or d.state='started' then raise exception 'Only the organizer may revise a date that is not underway' using errcode='42501';end if;
   perform hs_shared_dates.require_roster(users,v_actor);
   update hs_shared_dates.dates set revision=revision+1,title=btrim(requested_payload->>'title'),when_text=btrim(requested_payload->>'when'),meeting=btrim(requested_payload->>'meeting'),state='draft',updated_at=now() where id=d.id returning * into d;
   insert into hs_shared_dates.participants(date_id,revision,user_id) select d.id,d.revision,u from unnest(users) u;
  else
   select array_agg(user_id order by user_id) into users from hs_shared_dates.participants where date_id=d.id and revision=d.revision;
   if p_operation='send' then
    if d.organizer<>v_actor or d.state<>'draft' then raise exception 'Only the organizer may send an unsent draft' using errcode='42501';end if;
    perform hs_shared_dates.require_roster(users,d.organizer);
    update hs_shared_dates.participants set response='accepted',responded_at=now() where date_id=d.id and revision=d.revision and user_id=v_actor;
    update hs_shared_dates.dates set state='pending',updated_at=now() where id=d.id;
   elsif p_operation='respond' then
    answer:=requested_payload->>'response';
    if (select count(*) from jsonb_object_keys(requested_payload))<>1 or answer is null or answer not in ('accepted','declined','reschedule','withdrawn') then raise exception 'Choose your own response';end if;
    if d.state not in ('pending','confirmed') then raise exception 'This invitation round is closed';end if;
    select response into own_response from hs_shared_dates.participants where date_id=d.id and revision=d.revision and user_id=v_actor;
    if answer='withdrawn' and own_response<>'accepted' then raise exception 'Only an accepted participant can withdraw';end if;
    if own_response='accepted' and answer<>'withdrawn' then raise exception 'Withdraw your acceptance before changing your response';end if;
    if answer='accepted' then perform hs_shared_dates.require_roster(users,d.organizer);end if;
    update hs_shared_dates.participants set response=answer,responded_at=now() where date_id=d.id and revision=d.revision and user_id=v_actor;
    update hs_shared_dates.dates set state=case when answer in ('declined','withdrawn') then 'closed' when answer='reschedule' then 'needs_revision'
     when not exists(select 1 from hs_shared_dates.participants where date_id=d.id and revision=d.revision and response<>'accepted') then 'confirmed' else 'pending' end,updated_at=now() where id=d.id;
   elsif p_operation='begin' then
    perform hs_shared_dates.require_roster(users,d.organizer);
    if d.state<>'confirmed' or exists(select 1 from hs_shared_dates.participants where date_id=d.id and revision=d.revision and response<>'accepted') then raise exception 'Every included person must accept this version before beginning';end if;
    update hs_shared_dates.dates set state='started',updated_at=now() where id=d.id;
   elsif p_operation='stop' then
    if d.state<>'started' then raise exception 'Only an underway shared date can be stopped';end if;
    update hs_shared_dates.dates set state='stopped',updated_at=now() where id=d.id;
   end if;
  end if;
 end if;
 insert into hs_shared_dates.requests(actor,request_id,operation,date_id,expected_revision,payload) values(v_actor,p_request_id,p_operation,d.id,p_expected_revision,requested_payload);
 return hs_shared_dates.snapshot(d.id,v_actor);
end;$$;

-- Helper/table access is denied even to authenticated users. The private action
-- checks auth.uid() for every call; the exposed wrapper never elevates itself.
revoke all on all functions in schema hs_shared_dates from public,anon,authenticated;
grant execute on function hs_shared_dates.action(text,uuid,uuid,integer,jsonb,uuid) to authenticated;
create function public.shared_date_action(p_operation text,p_expected_user uuid,p_date_id uuid default null,p_expected_revision integer default null,p_payload jsonb default '{}'::jsonb,p_request_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $$
 select hs_shared_dates.action(p_operation,p_expected_user,p_date_id,p_expected_revision,p_payload,p_request_id);
$$;
revoke all on function public.shared_date_action(text,uuid,uuid,integer,jsonb,uuid) from public,anon;
grant execute on function public.shared_date_action(text,uuid,uuid,integer,jsonb,uuid) to authenticated;
