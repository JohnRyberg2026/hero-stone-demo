create function hs_membership_internal.my_terms(p_expected_user uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $terms$
declare e hs_membership_internal.founding_enrollments%rowtype;u uuid:=auth.uid();
begin
 if u is null or p_expected_user is distinct from u then raise exception 'Your signed-in account is required' using errcode='42501';end if;
 if not exists(select 1 from auth.users where id=u and not is_anonymous and deleted_at is null) then
  raise exception 'A registered account is required' using errcode='42501';
 end if;
 select f.* into e from hs_membership_internal.founding_members m
 join hs_membership_internal.founding_enrollments f on f.id=m.enrollment_id where m.account_id=u;
 if not found then return jsonb_build_object('enrolled',false);end if;
 return jsonb_build_object('enrolled',true,'tier','founding','activatedOn',e.activated_on,'freeUntil',e.free_until,
 'inFreePeriod',(now() at time zone 'UTC')::date<e.free_until,'annualPriceCents',e.annual_price_cents,
 'currency',e.currency,'billingInterval','year','foundingRecognition',e.permanent_recognition,
 'lifetimeAnnualRate',e.lifetime_annual_rate,'termsVersion',e.terms_version,
 'billingActivated',false,'worldQuestIncluded',false);
end;$terms$;
revoke all on function hs_membership_internal.my_terms(uuid) from public,anon;
grant usage on schema hs_membership_internal to authenticated;
grant execute on function hs_membership_internal.my_terms(uuid) to authenticated,service_role;
create function public.my_date_quest_membership(p_expected_user uuid)
returns jsonb language sql stable security invoker set search_path='' as $wrapper$
 select hs_membership_internal.my_terms(p_expected_user);
$wrapper$;
revoke all on function public.my_date_quest_membership(uuid) from public,anon;
grant execute on function public.my_date_quest_membership(uuid) to authenticated,service_role;
