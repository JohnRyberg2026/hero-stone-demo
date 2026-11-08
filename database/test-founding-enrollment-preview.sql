-- Owner runner on empty pilot roster / isolated DB. Synthetic writes roll back.
begin;
do $fixture$
declare ids uuid[]:='{}';a uuid;
begin
 if exists(select 1 from hs_membership_internal.founding_enrollments) then raise exception 'Use an empty pilot roster or isolated test database';end if;
 for i in 1..30 loop
  a:=gen_random_uuid();ids:=array_append(ids,a);
  insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Founding preview rollback fixture 20261108"}');
 end loop;
 perform set_config('test.preview.ids',array_to_string(ids,','),true);
 if has_function_privilege('authenticated','hs_membership_internal.preview_founding_enrollment(uuid,text,uuid[])','EXECUTE')
 or has_function_privilege('anon','hs_membership_internal.preview_founding_enrollment(uuid,text,uuid[])','EXECUTE') then raise exception 'Public preview grant';end if;
 if (select provolatile from pg_proc where oid='hs_membership_internal.preview_founding_enrollment(uuid,text,uuid[])'::regprocedure)<>'s' then raise exception 'Preview must be read-only stable';end if;
end $fixture$;
set local role authenticated;
do $denied$ begin
 begin perform hs_membership_internal.preview_founding_enrollment(gen_random_uuid(),'individual',array[gen_random_uuid()]);raise exception 'Client preview succeeded';exception when insufficient_privilege then null;end;
end $denied$;
reset role;
select set_config('request.jwt.claim.role','service_role',true),set_config('request.jwt.claims','{"role":"service_role"}',true);
set local role service_role;
do $check$
declare ids uuid[]:=string_to_array(current_setting('test.preview.ids'),',')::uuid[];req uuid:=gen_random_uuid();x jsonb;y jsonb;denied boolean;
begin
 x:=hs_membership_internal.preview_founding_enrollment(req,'couple',array[ids[1],ids[2]]);
 if x->>'readyToEnroll'<>'true' or x->>'reason'<>'ready' or x->>'remainingPlaces'<>'10' or x->>'annualPriceCents'<>'1200'
 or x->>'placeReserved'<>'false' or x->>'enrollmentChanged'<>'false' or x->>'billingActivated'<>'false' then raise exception 'Wrong ready preview';end if;
 if x<>hs_membership_internal.preview_founding_enrollment(req,'couple',array[ids[2],ids[1]]) then raise exception 'Repeated preview changed';end if;
 denied:=false;begin perform hs_membership_internal.preview_founding_enrollment(req,'couple',array[ids[1],ids[1]]);exception when invalid_parameter_value then denied:=true;end;if not denied then raise exception 'Duplicate input accepted';end if;
 x:=hs_membership_internal.preview_founding_enrollment(gen_random_uuid(),'individual',array[gen_random_uuid()]);
 if x->>'reason'<>'registered_accounts_required' or x->>'readyToEnroll'<>'false' then raise exception 'Missing account allowed';end if;
 y:=hs_membership_internal.enroll_founders(req,'couple',array[ids[1],ids[2]]);
 x:=hs_membership_internal.preview_founding_enrollment(req,'couple',array[ids[2],ids[1]]);
 if x->>'alreadyEnrolled'<>'true' or x->>'readyToEnroll'<>'false' or x->>'activationDateIsEstimate'<>'false' or x->>'activatedOn'<>y->>'activatedOn' or x->>'freeUntil'<>y->>'freeUntil' then raise exception 'Retry preview lost saved terms';end if;
 x:=hs_membership_internal.preview_founding_enrollment(req,'individual',array[ids[3]]);
 if x->>'reason'<>'request_conflict' or x->>'readyToEnroll'<>'false' or x->'activatedOn'<>'null'::jsonb then raise exception 'Request conflict not blocked';end if;
 x:=hs_membership_internal.preview_founding_enrollment(gen_random_uuid(),'individual',array[ids[1]]);
 if x->>'reason'<>'member_already_enrolled' then raise exception 'Duplicate member not blocked';end if;
 -- Preview is not a reservation: consume the five individual places afterward.
 x:=hs_membership_internal.preview_founding_enrollment(gen_random_uuid(),'individual',array[ids[30]]);
 if x->>'readyToEnroll'<>'true' then raise exception 'Available place not shown';end if;
 for i in 21..25 loop perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[ids[i]]);end loop;
 x:=hs_membership_internal.preview_founding_enrollment(gen_random_uuid(),'individual',array[ids[30]]);
 if x->>'readyToEnroll'<>'false' or x->>'reason'<>'place_type_full' or x->>'remainingPlaces'<>'0' then raise exception 'Stale capacity allowed';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[ids[30]]);exception when check_violation then denied:=true;end;if not denied then raise exception 'Commit trusted earlier preview';end if;
 perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 denied:=false;begin perform hs_membership_internal.preview_founding_enrollment(req,'couple',array[ids[1],ids[2]]);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Untrusted role accepted';end if;
end $check$;
reset role;
do $unchanged$
declare before_state jsonb;after_state jsonb;ids uuid[]:=string_to_array(current_setting('test.preview.ids'),',')::uuid[];
begin
 select jsonb_build_array((select jsonb_agg(to_jsonb(t) order by id) from hs_membership_internal.founding_enrollments t),(select jsonb_agg(to_jsonb(t) order by account_id) from hs_membership_internal.founding_members t),(select jsonb_agg(to_jsonb(t) order by kind) from hs_membership_internal.founding_limits t)) into before_state;
 perform set_config('request.jwt.claim.role','service_role',true);perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform hs_membership_internal.preview_founding_enrollment(gen_random_uuid(),'couple',array[ids[3],ids[4]]);
 select jsonb_build_array((select jsonb_agg(to_jsonb(t) order by id) from hs_membership_internal.founding_enrollments t),(select jsonb_agg(to_jsonb(t) order by account_id) from hs_membership_internal.founding_members t),(select jsonb_agg(to_jsonb(t) order by kind) from hs_membership_internal.founding_limits t)) into after_state;
 if before_state is distinct from after_state then raise exception 'Preview changed persisted data';end if;
 if (select count(*) from hs_membership_internal.founding_enrollments)<>6 then raise exception 'Preview enrolled accounts';end if;
end $unchanged$;
rollback;
select 'PASS: administrator-only read-only preview, exact terms/capacity, duplicate and request conflict checks, saved retry dates, no reservation, commit rechecks current capacity; all fixtures rolled back' as result;
