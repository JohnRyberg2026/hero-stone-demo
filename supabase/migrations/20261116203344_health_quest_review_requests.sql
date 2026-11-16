-- Test pilot request history only. No reviewer access, clearance, payment or release authority.
create table public.health_quest_review_requests (
 owner_id uuid not null, plan_id uuid not null, version integer not null,
 revision integer not null check(revision>0),
 state text not null check(state in ('requested','withdrawn')),
 action_id uuid not null, created_at timestamptz not null default now(),
 primary key(owner_id,plan_id,version,revision),unique(owner_id,action_id),
 foreign key(owner_id,plan_id,version) references public.health_quest_plan_versions(owner_id,plan_id,version) on delete cascade
);
alter table public.health_quest_review_requests enable row level security;
revoke all on public.health_quest_review_requests from public,anon,authenticated;
grant select,insert on public.health_quest_review_requests to authenticated;
create policy review_requests_owner on public.health_quest_review_requests for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create function health_quest_internal.validate_review_request() returns trigger
language plpgsql security invoker set search_path='' as $$
declare prior public.health_quest_review_requests%rowtype;latest integer;
begin
 if auth.uid() is null or new.owner_id is distinct from auth.uid() then raise exception 'Account changed' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(new.owner_id::text||new.plan_id::text,0));
 select * into prior from public.health_quest_review_requests where owner_id=auth.uid() and plan_id=new.plan_id and version=new.version order by revision desc limit 1;
 if new.revision<>coalesce(prior.revision,0)+1 then raise exception 'Request changed; reload';end if;
 if new.state='requested' then
  select max(version) into latest from public.health_quest_plan_versions where owner_id=auth.uid() and plan_id=new.plan_id;
  if new.version is distinct from latest then raise exception 'Request the latest plan version';end if;
  if not exists(select 1 from public.health_quest_plan_approvals where owner_id=auth.uid() and plan_id=new.plan_id and version=new.version) then raise exception 'Approve the exact sample version first';end if;
  if prior.state='requested' then raise exception 'Already requested';end if;
 elsif prior.state is distinct from 'requested' then raise exception 'No pending request to withdraw';
 end if;
 new.created_at:=now();return new;
end;$$;
revoke all on function health_quest_internal.validate_review_request() from public,anon,authenticated;
create trigger validate_review_request before insert on public.health_quest_review_requests for each row execute function health_quest_internal.validate_review_request();

create function public.health_quest_set_review_request(p_expected_user uuid,p_plan_id uuid,p_version integer,p_expected_revision integer,p_state text,p_action_id uuid,p_confirmed boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare existing public.health_quest_review_requests%rowtype;result public.health_quest_review_requests%rowtype;
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'Account changed' using errcode='42501';end if;
 if p_confirmed is distinct from true or p_plan_id is null or p_version is null or p_expected_revision is null or p_expected_revision<0 or p_action_id is null or p_state is null or p_state not in ('requested','withdrawn') then raise exception 'Confirm the exact review request action';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_plan_id::text,0));
 select * into existing from public.health_quest_review_requests where owner_id=auth.uid() and action_id=p_action_id;
 if found then
  if existing.plan_id is distinct from p_plan_id or existing.version is distinct from p_version or existing.revision<>p_expected_revision+1 or existing.state is distinct from p_state then raise exception 'Request action reused';end if;
  return to_jsonb(existing);
 end if;
 insert into public.health_quest_review_requests(owner_id,plan_id,version,revision,state,action_id) values(auth.uid(),p_plan_id,p_version,p_expected_revision+1,p_state,p_action_id) returning * into result;
 return to_jsonb(result);
end;$$;
revoke all on function public.health_quest_set_review_request(uuid,uuid,integer,integer,text,uuid,boolean) from public,anon;
grant execute on function public.health_quest_set_review_request(uuid,uuid,integer,integer,text,uuid,boolean) to authenticated;
