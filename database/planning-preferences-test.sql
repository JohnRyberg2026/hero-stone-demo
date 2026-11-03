-- All writes roll back; no actual preferences retained.
begin;
do $$declare p record;begin
 select heart_stone_id,array_agg(user_id order by user_id) ids into p from public.heart_stone_memberships where status='active' group by heart_stone_id having count(distinct user_id)=2 limit 1;
 if p.heart_stone_id is null then raise exception 'Need two test accounts';end if;
 perform set_config('test.a',p.ids[1]::text,true);perform set_config('test.b',p.ids[2]::text,true);
end $$;
set local role authenticated;
do $$declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;x jsonb;rev int;denied boolean;begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.my_planning_preferences(a);rev:=(x->>'revision')::int;
 x:=public.my_planning_preferences(a,'save',rev,'{"budget":"TEST $50 total","activities":"TEST quiet walks"}',false);
 if (x->>'useWithAI')::boolean then raise exception 'AI consent silently enabled';end if;
 if x#>>'{profile,budget}'<>'TEST $50 total' then raise exception 'Save failed';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'save',rev,'{}',true);exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Stale edit accepted';end if;
 rev:=(x->>'revision')::int;
 x:=public.my_planning_preferences(a,'save',rev,'{"activities":"TEST quiet walks"}',true);
 if not (x->>'useWithAI')::boolean then raise exception 'Opt in failed';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'save',(x->>'revision')::int,'{"secret":"not allowed"}',true);exception when others then denied:=true;end;if not denied then raise exception 'Unknown field accepted';end if;
 rev:=(x->>'revision')::int;x:=public.my_planning_preferences(a,'delete',rev);
 if x->'profile'<>'{}'::jsonb or (x->>'useWithAI')::boolean then raise exception 'Delete retained preferences or consent';end if;
 denied:=false;begin perform public.my_planning_preferences(a,'save',rev,'{"activities":"restore"}',true);exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Stale tab restored deleted preferences';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 denied:=false;begin perform public.my_planning_preferences(a);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Other account read preferences';end if;
 if exists(select 1 from public.user_onboarding_answers where user_id=a and question_key='heartstone_planning_preferences_v1') then raise exception 'RLS exposed owner record';end if;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;begin perform public.my_planning_preferences(a);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Unauthenticated read';end if;
end $$;
reset role;
select 'PASS: private save/load, explicit AI opt-in/off, field validation, revision conflict, delete/tombstone, cross-account RLS and unauthenticated denial; rolled back' as result;
rollback;
