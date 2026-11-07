begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();g uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values
 (a,'{"first_name":"Membership read rollback fixture 20261107"}'),(b,'{"first_name":"Membership read rollback fixture 20261107"}'),(c,'{"first_name":"Membership read rollback fixture 20261107"}');
 insert into auth.users(id,is_anonymous,raw_user_meta_data) values(g,true,'{"first_name":"Membership read rollback fixture 20261107"}');
 perform set_config('request.jwt.claim.role','service_role',true);perform set_config('request.jwt.claims','{"role":"service_role"}',true);
 perform hs_membership_internal.enroll_founders(gen_random_uuid(),'couple',array[a,b]);
 perform set_config('test.membership.a',a::text,true);perform set_config('test.membership.b',b::text,true);perform set_config('test.membership.c',c::text,true);perform set_config('test.membership.g',g::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.membership.a')::uuid;b uuid:=current_setting('test.membership.b')::uuid;c uuid:=current_setting('test.membership.c')::uuid;g uuid:=current_setting('test.membership.g')::uuid;x jsonb;denied boolean;
begin
 perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.my_date_quest_membership(a);
 if x->>'enrolled'<>'true' or x->>'annualPriceCents'<>'1200' or x->>'billingActivated'<>'false' or x->>'lifetimeAnnualRate'<>'true' then raise exception 'Own terms incorrect';end if;
 if x ? 'account_ids' or x ? 'accountIds' or x ? 'enrollmentId' or x ? 'registeredMembers' or x::text like '%'||b::text||'%' then raise exception 'Partner or roster metadata leaked';end if;
 denied:=false;begin perform public.my_date_quest_membership(b);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Partner expected-user spoof accepted';end if;
 denied:=false;begin perform public.my_date_quest_membership(null);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Null expected-user accepted';end if;
 denied:=false;begin perform 1 from hs_membership_internal.founding_members;exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Roster readable';end if;
 denied:=false;begin perform hs_membership_internal.enroll_founders(gen_random_uuid(),'individual',array[a]);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Self enrollment allowed';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);if public.my_date_quest_membership(b)<>x then raise exception 'Couple member own terms mismatch';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);if public.my_date_quest_membership(c)<>'{"enrolled":false}'::jsonb then raise exception 'Unenrolled account received terms';end if;
 denied:=false;begin perform hs_membership_internal.my_terms(a);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Direct internal spoof accepted';end if;
 perform set_config('request.jwt.claim.sub',g::text,true);denied:=false;begin perform public.my_date_quest_membership(g);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Anonymous Auth user accepted';end if;
 perform set_config('request.jwt.claim.sub','',true);denied:=false;begin perform public.my_date_quest_membership(a);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Missing identity accepted';end if;
end $check$;
reset role;
set local role anon;
do $check$ begin
 begin perform public.my_date_quest_membership(gen_random_uuid());raise exception 'Signed-out RPC accepted';exception when insufficient_privilege then null;end;
end $check$;
reset role;
rollback;
select 'PASS: owner-only saved terms, partner/outsider/null/anonymous denial, no roster identifiers, self-enrollment blocked, rollback complete' as result;
