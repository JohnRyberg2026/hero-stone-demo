alter table hs_membership_internal.founding_limits add column used_places integer not null default 0 check(used_places>=0 and used_places<=maximum_places);
update hs_membership_internal.founding_limits l set used_places=(select count(*) from hs_membership_internal.founding_enrollments e where e.kind=l.kind);
create or replace function hs_membership_internal.enroll_founders(p_request_id uuid,p_kind text,p_account_ids uuid[])
returns jsonb language plpgsql security definer set search_path='' as $enroll$
declare ids uuid[];existing hs_membership_internal.founding_enrollments%rowtype;
 cap integer;activation date:=(now() at time zone 'UTC')::date;
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
  update hs_membership_internal.founding_limits set used_places=used_places+1
  where kind=p_kind and used_places<maximum_places returning used_places into cap;
  if not found then raise exception 'This founding place type is full' using errcode='23514';end if;
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
