-- Synthetic accounts only. All fixture writes roll back; no real preferences used.
begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();h uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Preferences audit rollback fixture 20261107"}'),(b,'{"first_name":"Preferences audit rollback fixture 20261107"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 perform set_config('test.a',a::text,true);perform set_config('test.b',b::text,true);perform set_config('test.h',h::text,true);
end $fixture$;
set local role authenticated;
do $$declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;x jsonb;rev int;denied boolean;begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.my_planning_preferences(a);rev:=(x->>'revision')::int;
 x:=public.my_planning_preferences(a,'save',rev,'{"budget":"TEST $50 total","activities":"TEST quiet walks"}',false);
 if (x->>'useWithAI')::boolean then raise exception 'AI consent silently enabled';end if;
 if x#>>'{profile,budget}'<>'TEST $50 total' then raise exception 'Save failed';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'save',rev,'{}',true);exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Stale edit accepted';end if;
 rev:=(x->>'revision')::int;
 x:=public.my_planning_preferences(a,'save',rev,'{"activities":"TEST quiet walks"}',true);
 if not (x->>'useWithAI')::boolean then raise exception 'Opt in failed';end if;
 rev:=(x->>'revision')::int;
 x:=public.my_planning_preferences(a,'save',rev,'{"activities":"TEST quiet walks"}',false);
 if (x->>'useWithAI')::boolean then raise exception 'Opt out failed';end if;
 denied:=false;
 begin perform public.save_shared_onboarding_answer(current_setting('test.h')::uuid,'audit_explicit_shared','{"plan":"A walk"}');
 exception when insufficient_privilege then
  if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
  denied:=true;
 end;
 if not denied then raise exception 'Unrostered legacy onboarding accepted';end if;
 if exists(select 1 from public.couple_onboarding_answers where heart_stone_id=current_setting('test.h')::uuid and answer_json::text like '%TEST quiet walks%') then raise exception 'Private preferences copied to shared answers';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'save',(x->>'revision')::int,'{"secret":"not allowed"}',true);exception when others then denied:=true;end;if not denied then raise exception 'Unknown field accepted';end if;
 rev:=(x->>'revision')::int;x:=public.my_planning_preferences(a,'delete',rev);
 if x->'profile'<>'{}'::jsonb or (x->>'useWithAI')::boolean then raise exception 'Delete retained preferences or consent';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'save',rev,'{"activities":"restore"}',true);exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Stale tab restored deleted preferences';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 denied:=false;begin perform public.my_planning_preferences(a);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Other account read preferences';end if;
 if exists(select 1 from public.user_onboarding_answers where user_id=a and question_key='heartstone_planning_preferences_v1') then raise exception 'RLS exposed owner record';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'save',0,'{"activities":"Partner overwrite"}',true);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Partner preference overwrite allowed';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'delete',0);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Partner preference deletion allowed';end if;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform public.my_planning_preferences(a);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Unauthenticated read';end if;
end $$;
reset role;
select 'PASS: private save/load, explicit AI opt-in/off, field validation, revision conflict, delete/tombstone, cross-account RLS and unauthenticated denial; rolled back' as result;
rollback;
