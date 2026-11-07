-- Private, administrator-only founding enrollment. No public API or billing activation.
create schema hs_membership_internal;
revoke all on schema hs_membership_internal from public,anon,authenticated;
grant usage on schema hs_membership_internal to service_role;

create table hs_membership_internal.founding_limits(
 kind text primary key check(kind in ('couple','individual')),
 maximum_places integer not null check(maximum_places>0)
);
insert into hs_membership_internal.founding_limits values('couple',10),('individual',5);
create table hs_membership_internal.founding_enrollments(
 id uuid primary key default gen_random_uuid(),
 request_id uuid not null unique,
 kind text not null references hs_membership_internal.founding_limits(kind),
 account_ids uuid[] not null,
 activated_on date not null,
 free_until date not null,
 terms_version text not null check(terms_version='2026-11-07'),
 annual_price_cents integer not null check(annual_price_cents=1200),
 currency text not null check(currency='USD'),
 permanent_recognition boolean not null check(permanent_recognition),
 lifetime_annual_rate boolean not null check(lifetime_annual_rate),
 created_at timestamptz not null default now(),
 check(cardinality(account_ids)=case when kind='couple' then 2 else 1 end),
 check(free_until=(activated_on+interval '1 year')::date)
);
create table hs_membership_internal.founding_members(
 account_id uuid primary key,
 enrollment_id uuid not null references hs_membership_internal.founding_enrollments(id),
 unique(enrollment_id,account_id)
);
-- Historical seats are retained; signup, signout and relationship changes never refill them.
alter table hs_membership_internal.founding_limits enable row level security;
alter table hs_membership_internal.founding_enrollments enable row level security;
alter table hs_membership_internal.founding_members enable row level security;
revoke all on all tables in schema hs_membership_internal from public,anon,authenticated,service_role;

create function hs_membership_internal.enroll_founders(p_request_id uuid,p_kind text,p_account_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $enroll$
declare ids uuid[];existing hs_membership_internal.founding_enrollments%rowtype;
 cap integer;used integer;activation date:=(now() at time zone 'UTC')::date;
begin
 if auth.role() is distinct from 'service_role' then raise exception 'Administrator enrollment only' using errcode='42501';end if;
 if p_request_id is null or p_kind is null or p_kind not in('couple','individual') or p_account_ids is null
 or cardinality(p_account_ids)<>(case when p_kind='couple' then 2 else 1 end)
 or array_position(p_account_ids,null) is not null then
  raise exception 'A founding place needs one individual account or two couple accounts' using errcode='22023';
 end if;
 select array_agg(id order by id) into ids from unnest(p_account_ids) id;
 if (select count(distinct id) from unnest(ids) id)<>cardinality(ids) then
  raise exception 'Each founding member needs a distinct account' using errcode='22023';
 end if;
 -- Serialize every admission, including cross-kind retries and duplicate accounts.
 perform pg_advisory_xact_lock(736401921540812::bigint);
 select * into existing from hs_membership_internal.founding_enrollments where request_id=p_request_id;
 if found then
  if existing.kind<>p_kind or existing.account_ids<>ids then
   raise exception 'Enrollment request already used for a different place' using errcode='22023';
  end if;
 else
  if (select count(*) from auth.users u where u.id=any(ids) and not u.is_anonymous and u.deleted_at is null)<>cardinality(ids) then
   raise exception 'All members need existing nonanonymous accounts' using errcode='22023';
  end if;
  if exists(select 1 from hs_membership_internal.founding_members where account_id=any(ids)) then
   raise exception 'A member already has a founding place' using errcode='23505';
  end if;
  select maximum_places into cap from hs_membership_internal.founding_limits where kind=p_kind;
  select count(*) into used from hs_membership_internal.founding_enrollments where kind=p_kind;
  if used>=cap then raise exception 'This founding place type is full' using errcode='23514';end if;
  insert into hs_membership_internal.founding_enrollments(request_id,kind,account_ids,activated_on,free_until,terms_version,annual_price_cents,currency,permanent_recognition,lifetime_annual_rate)
  values(p_request_id,p_kind,ids,activation,(activation+interval '1 year')::date,'2026-11-07',1200,'USD',true,true)
  returning * into existing;
  insert into hs_membership_internal.founding_members(account_id,enrollment_id) select id,existing.id from unnest(ids) id;
 end if;
 return jsonb_build_object('enrollmentId',existing.id,'kind',existing.kind,'registeredMembers',cardinality(existing.account_ids),
  'activatedOn',existing.activated_on,'freeUntil',existing.free_until,'annualPriceCents',existing.annual_price_cents,
  'currency',existing.currency,'billingInterval','year','termsVersion',existing.terms_version,
  'foundingRecognition',existing.permanent_recognition,'lifetimeAnnualRate',existing.lifetime_annual_rate,
  'billingActivated',false,'worldQuestIncluded',false);
end;
$enroll$;
revoke all on function hs_membership_internal.enroll_founders(uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function hs_membership_internal.enroll_founders(uuid,text,uuid[]) to service_role;
