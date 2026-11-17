-- Pilot reviewer authority is server-managed and unassigned by default.
create schema health_quest_review_private;
revoke all on schema health_quest_review_private from public,anon,authenticated;
grant usage on schema health_quest_review_private to authenticated;
create table health_quest_review_private.reviewer (
 slot text primary key check(slot='john'),
 user_id uuid not null unique references public.profiles(id) on delete cascade
);
alter table health_quest_review_private.reviewer enable row level security;
create policy no_client_reviewer_assignment on health_quest_review_private.reviewer for all to authenticated using(false) with check(false);
revoke all on health_quest_review_private.reviewer from public,anon,authenticated;
create table public.health_quest_review_decisions (
 owner_id uuid not null,plan_id uuid not null,version integer not null,
 request_revision integer not null,reviewer_id uuid not null references public.profiles(id),
 decision text not null check(decision in ('cleared','held')),
 reason text not null check(length(reason) between 1 and 500),
 action_id uuid not null,created_at timestamptz not null default now(),
 primary key(owner_id,plan_id,version,request_revision),unique(reviewer_id,action_id),
 foreign key(owner_id,plan_id,version,request_revision) references public.health_quest_review_requests(owner_id,plan_id,version,revision)
);
create index health_quest_review_decisions_reviewer on public.health_quest_review_decisions(reviewer_id);
alter table public.health_quest_review_decisions enable row level security;
revoke all on public.health_quest_review_decisions from public,anon,authenticated;
grant select on public.health_quest_review_decisions to authenticated;
create policy member_read_review_decisions on public.health_quest_review_decisions for select to authenticated using(owner_id=(select auth.uid()));

-- Narrow cross-owner read, solely for the assigned reviewer and currently requested exact versions.
create function health_quest_review_private.queue(p_expected_user uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() or not exists(select 1 from health_quest_review_private.reviewer where slot='john' and user_id=auth.uid()) then raise exception 'Reviewer access not assigned' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(item)),'[]'::jsonb) into result from (
  select r.owner_id,r.plan_id,r.version,r.revision as request_revision,r.created_at as requested_at,v.payload,d.decision,d.reason
  from public.health_quest_review_requests r
  join public.health_quest_plan_versions v using(owner_id,plan_id,version)
  join public.health_quest_plan_approvals a using(owner_id,plan_id,version)
  left join public.health_quest_review_decisions d on d.owner_id=r.owner_id and d.plan_id=r.plan_id and d.version=r.version and d.request_revision=r.revision
  where r.state='requested'
   and not exists(select 1 from public.health_quest_review_requests newer where newer.owner_id=r.owner_id and newer.plan_id=r.plan_id and newer.version=r.version and newer.revision>r.revision)
   and not exists(select 1 from public.health_quest_plan_versions newer where newer.owner_id=r.owner_id and newer.plan_id=r.plan_id and newer.version>r.version)
  order by r.created_at limit 100
 ) item;
 return result;
end;$$;
revoke all on function health_quest_review_private.queue(uuid) from public,anon,authenticated;
grant execute on function health_quest_review_private.queue(uuid) to authenticated;
create function public.health_quest_reviewer_queue(p_expected_user uuid) returns jsonb
language sql security invoker set search_path='' as $$select health_quest_review_private.queue(p_expected_user)$$;
revoke all on function public.health_quest_reviewer_queue(uuid) from public,anon;
grant execute on function public.health_quest_reviewer_queue(uuid) to authenticated;

create function health_quest_review_private.decide(p_expected_user uuid,p_owner_id uuid,p_plan_id uuid,p_version integer,p_request_revision integer,p_decision text,p_reason text,p_action_id uuid,p_confirmed boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare prior public.health_quest_review_decisions%rowtype;r public.health_quest_review_requests%rowtype;result public.health_quest_review_decisions%rowtype;
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() or not exists(select 1 from health_quest_review_private.reviewer where slot='john' and user_id=auth.uid()) then raise exception 'Reviewer access not assigned' using errcode='42501';end if;
 if p_confirmed is distinct from true or p_owner_id is null or p_plan_id is null or p_version is null or p_request_revision is null or p_action_id is null or p_decision is null or p_decision not in ('cleared','held') or p_reason is null or length(trim(p_reason)) not between 1 and 500 then raise exception 'Confirm exact review decision and reason';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner_id::text||p_plan_id::text,0));
 select * into prior from public.health_quest_review_decisions where reviewer_id=auth.uid() and action_id=p_action_id;
 if found then
  if prior.owner_id is distinct from p_owner_id or prior.plan_id is distinct from p_plan_id or prior.version is distinct from p_version or prior.request_revision is distinct from p_request_revision or prior.decision is distinct from p_decision or prior.reason is distinct from trim(p_reason) then raise exception 'Review action reused';end if;
  return to_jsonb(prior);
 end if;
 select * into r from public.health_quest_review_requests where owner_id=p_owner_id and plan_id=p_plan_id and version=p_version order by revision desc limit 1;
 if r.revision is distinct from p_request_revision or r.state is distinct from 'requested' then raise exception 'Request withdrawn or changed; reload';end if;
 if exists(select 1 from public.health_quest_plan_versions where owner_id=p_owner_id and plan_id=p_plan_id and version>p_version) then raise exception 'Plan changed; reload';end if;
 if not exists(select 1 from public.health_quest_plan_approvals where owner_id=p_owner_id and plan_id=p_plan_id and version=p_version) then raise exception 'Member approval missing';end if;
 insert into public.health_quest_review_decisions(owner_id,plan_id,version,request_revision,reviewer_id,decision,reason,action_id)
 values(p_owner_id,p_plan_id,p_version,p_request_revision,auth.uid(),p_decision,trim(p_reason),p_action_id) returning * into result;
 return to_jsonb(result);
end;$$;
revoke all on function health_quest_review_private.decide(uuid,uuid,uuid,integer,integer,text,text,uuid,boolean) from public,anon,authenticated;
grant execute on function health_quest_review_private.decide(uuid,uuid,uuid,integer,integer,text,text,uuid,boolean) to authenticated;
create function public.health_quest_review_plan(p_expected_user uuid,p_owner_id uuid,p_plan_id uuid,p_version integer,p_request_revision integer,p_decision text,p_reason text,p_action_id uuid,p_confirmed boolean) returns jsonb
language sql security invoker set search_path='' as $$select health_quest_review_private.decide(p_expected_user,p_owner_id,p_plan_id,p_version,p_request_revision,p_decision,p_reason,p_action_id,p_confirmed)$$;
revoke all on function public.health_quest_review_plan(uuid,uuid,uuid,integer,integer,text,text,uuid,boolean) from public,anon;
grant execute on function public.health_quest_review_plan(uuid,uuid,uuid,integer,integer,text,text,uuid,boolean) to authenticated;
