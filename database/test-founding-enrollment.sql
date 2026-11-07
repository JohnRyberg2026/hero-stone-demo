-- Database owner runner. All accounts and enrollments are synthetic and roll back.
begin;
do $fixture$
declare ids uuid[]:='{}';a uuid;
begin
 if exists(select 1 from hs_membership_internal.founding_enrollments) then
  raise exception 'Run this capacity fixture on an empty founding roster or isolated test database';
 end if;
 for i in 1..29 loop
  a:=gen_random_uuid();ids:=array_append(ids,a);
  insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Founding enrollment rollback fixture 20261107"}');
 end loop;
 a:=gen_random_uuid();insert into auth.users(id,is_anonymous,raw_user_meta_data) values(a,true,'{"first_name":"Founding enrollment rollback fixture 20261107"}');
 perform set_config('test.founding.ids',array_to_string(ids,','),true);
 perform set_config('test.founding.anonymous',a::text,true);
 -- Schema usage permits only the separately guarded own-terms lookup; roster tables and enrollment remain denied.
 if has_function_privilege('authenticated','hs_membership_internal.enroll_founders(uuid,text,uuid[])','EXECUTE')
 or has_function_privilege('anon','hs_membership_internal.enroll_founders(uuid,text,uuid[])','EXECUTE') then raise exception 'Client enrollment grant';end if;
 if has_table_privilege('service_role','hs_membership_internal.founding_members','INSERT,UPDATE,DELETE') then raise exception 'Direct service roster mutation granted';end if;
end $fixture$;
select set_config('request.jwt.claims','{"role":"authenticated"}',true),set_config('request.jwt.claim.role','authenticated',true);
set local role authenticated;
do $check$
begin
 begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[gen_random_uuid()]);raise exception 'Self enrollment accepted';exception when insufficient_privilege then null;end;
 begin perform 1 from hs_membership_internal.founding_members;raise exception 'Client roster readable';exception when insufficient_privilege then null;end;
end $check$;
reset role;
select set_config('request.jwt.claims','{"role":"service_role"}',true),set_config('request.jwt.claim.role','service_role',true);
set local role service_role;
do $check$
declare ids uuid[]:=string_to_array(current_setting('test.founding.ids'),',')::uuid[];
 req uuid:=gen_random_uuid();a jsonb;b jsonb;denied boolean;
begin
 a:=hs_membership_internal.enroll_founders(req,'couple',array[ids[1],ids[2]]);
 b:=hs_membership_internal.enroll_founders(req,'couple',array[ids[2],ids[1]]);
 if a<>b then raise exception 'Retry changed entitlement';end if;
 if a->>'annualPriceCents'<>'1200' or a->>'foundingRecognition'<>'true' or a->>'lifetimeAnnualRate'<>'true'
 or a->>'billingActivated'<>'false' or a->>'worldQuestIncluded'<>'false' or a->>'registeredMembers'<>'2' then raise exception 'Locked terms changed';end if;
 if (a->>'activatedOn')::date<>(now() at time zone 'UTC')::date or (a->>'freeUntil')::date<>((a->>'activatedOn')::date+interval '1 year')::date then raise exception 'Wrong free-year boundary';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(req,'individual',array[ids[1]]);exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Request ID reused with different payload';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[ids[1]]);exception when unique_violation then denied:=true;end;
 if not denied then raise exception 'Account occupied two places';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'couple',array[ids[3],ids[3]]);exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Duplicate couple account accepted';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[gen_random_uuid()]);exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Nonexistent account enrolled';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[current_setting('test.founding.anonymous')::uuid]);exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Anonymous account enrolled';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'couple',array[ids[3]]);exception when invalid_parameter_value then denied:=true;end;
 if not denied then raise exception 'Incomplete couple accepted';end if;
 for i in 2..10 loop perform hs_membership_internal.enroll_founders(gen_random_uuid(),'couple',array[ids[2*i-1],ids[2*i]]);end loop;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'couple',array[ids[26],ids[27]]);exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Eleventh couple accepted using empty individual places';end if;
 for i in 21..25 loop perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[ids[i]]);end loop;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[ids[28]]);exception when check_violation then denied:=true;end;
 if not denied then raise exception 'Sixth individual accepted';end if;
 if hs_membership_internal.enroll_founders(req,'couple',array[ids[1],ids[2]])<>a then raise exception 'Full roster prevented safe retry';end if;
end $check$;
reset role;
do $check$
begin
 if exists(select 1 from hs_membership_internal.founding_limits l where l.used_places<>(select count(*) from hs_membership_internal.founding_enrollments e where e.kind=l.kind)) then raise exception 'Quota counter drift';end if;
 if (select count(*) from hs_membership_internal.founding_enrollments)<>15
 or (select count(*) from hs_membership_internal.founding_members)<>25 then raise exception 'Roster totals wrong';end if;
 if exists(select 1 from hs_membership_internal.founding_members m join hs_pilot_internal.legacy_accounts l on l.user_id=m.account_id) then raise exception 'Enrollment expanded legacy access';end if;
end $check$;
rollback;
select 'PASS: exact founding quotas; duplicate and invalid account denial; stable retry and original terms; ordinary-client denial; no billing or legacy access; all fixture writes rolled back' as result;
