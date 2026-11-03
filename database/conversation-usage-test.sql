-- Database owner runner. All counter changes roll back; no provider calls.
begin;
do $$declare u uuid;begin select id into u from auth.users order by id limit 1;if u is null then raise exception 'Need a pilot account';end if;perform set_config('test.usage_user',u::text,true);end $$;
set local role authenticated;
do $$declare denied boolean:=false;begin
 begin perform public.reserve_heartstone_conversation(current_setting('test.usage_user')::uuid);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Client can spend quota';end if;
 denied:=false;begin perform 1 from hs_usage_internal.conversation_usage;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Client can read counters';end if;
end $$;
reset role;
delete from hs_usage_internal.conversation_usage where user_id=current_setting('test.usage_user')::uuid;
set local role service_role;
do $$declare x jsonb;u uuid:=current_setting('test.usage_user')::uuid;begin
 for i in 1..6 loop x:=public.reserve_heartstone_conversation(u);if not (x->>'allowed')::boolean then raise exception 'Allowed turn rejected';end if;end loop;
 x:=public.reserve_heartstone_conversation(u);if (x->>'allowed')::boolean or x->>'scope'<>'minute' or (x->>'retryAfterSeconds')::int not between 1 and 60 then raise exception 'Minute boundary failed';end if;
end $$;
reset role;
update hs_usage_internal.conversation_usage set recent=array[now()-interval '61 seconds'] where user_id=current_setting('test.usage_user')::uuid;
set local role service_role;
do $$begin if not (public.reserve_heartstone_conversation(current_setting('test.usage_user')::uuid)->>'allowed')::boolean then raise exception 'Rolling window did not expire';end if;end $$;
reset role;
update hs_usage_internal.conversation_usage set daily_count=99,recent='{}' where user_id=current_setting('test.usage_user')::uuid;
set local role service_role;
do $$declare x jsonb;begin
 x:=public.reserve_heartstone_conversation(current_setting('test.usage_user')::uuid);if not (x->>'allowed')::boolean then raise exception '100th request rejected';end if;
 x:=public.reserve_heartstone_conversation(current_setting('test.usage_user')::uuid);if (x->>'allowed')::boolean or x->>'scope'<>'day' or (x->>'retryAfterSeconds')::int not between 1 and 86400 then raise exception 'Daily boundary failed';end if;
end $$;
reset role;
update hs_usage_internal.conversation_usage set usage_day=(now() at time zone 'UTC')::date-1,recent='{}' where user_id=current_setting('test.usage_user')::uuid;
set local role service_role;
do $$begin if not (public.reserve_heartstone_conversation(current_setting('test.usage_user')::uuid)->>'allowed')::boolean then raise exception 'Daily reset failed';end if;end $$;
reset role;
do $$begin
 if (select daily_count from hs_usage_internal.conversation_usage where user_id=current_setting('test.usage_user')::uuid)<>1 then raise exception 'New day counter not reset';end if;
 if has_function_privilege('anon','public.reserve_heartstone_conversation(uuid)','execute') then raise exception 'Anonymous execute allowed';end if;
end $$;
select 'PASS: six/minute, 100/day, rolling expiry, daily rollover, retry values and client/anon access denial. All writes rolled back.' as result;
rollback;
