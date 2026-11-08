-- Administrator-only, read-only review. Does not reserve a place or grant access.
create function hs_membership_internal.preview_founding_enrollment(p_request_id uuid,p_kind text,p_account_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' as $preview$
declare ids uuid[];existing hs_membership_internal.founding_enrollments%rowtype;
 limits hs_membership_internal.founding_limits%rowtype;valid_accounts integer;already_members integer;
 activation date:=(now() at time zone 'UTC')::date;reason text;prior boolean:=false;
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
 select * into limits from hs_membership_internal.founding_limits where kind=p_kind;
 select * into existing from hs_membership_internal.founding_enrollments where request_id=p_request_id;
 if found then
  if existing.kind<>p_kind or existing.account_ids<>ids then reason:='request_conflict';
  else prior:=true;activation:=existing.activated_on;reason:='existing_enrollment';end if;
 else
  select count(*) into valid_accounts from auth.users where id=any(ids) and not is_anonymous and deleted_at is null;
  select count(*) into already_members from hs_membership_internal.founding_members where account_id=any(ids);
  if valid_accounts<>cardinality(ids) then reason:='registered_accounts_required';
  elsif already_members>0 then reason:='member_already_enrolled';
  elsif limits.used_places>=limits.maximum_places then reason:='place_type_full';
  else reason:='ready';end if;
 end if;
 return jsonb_build_object(
  'readyToEnroll',reason='ready','alreadyEnrolled',prior,'reason',reason,'kind',p_kind,
  'registeredMembers',cardinality(ids),'remainingPlaces',limits.maximum_places-limits.used_places,
  'placeReserved',false,'enrollmentChanged',false,
  'activationDateIsEstimate',not prior,'activatedOn',case when reason in('ready','existing_enrollment') then activation end,
  'freeUntil',case when reason in('ready','existing_enrollment') then (activation+interval '1 year')::date end,
  'annualPriceCents',1200,'currency','USD','billingInterval','year',
  'foundingRecognition',true,'lifetimeAnnualRate',true,'termsVersion','2026-11-07',
  'billingActivated',false,'worldQuestIncluded',false);
end;$preview$;
revoke all on function hs_membership_internal.preview_founding_enrollment(uuid,text,uuid[]) from public,anon,authenticated;
grant execute on function hs_membership_internal.preview_founding_enrollment(uuid,text,uuid[]) to service_role;
