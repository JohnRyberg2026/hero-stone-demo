-- Database-owner runner. Every availability write is rolled back; no notifications.
begin;
do $$declare p record;begin
 select heart_stone_id,array_agg(user_id order by user_id) ids into p from public.heart_stone_memberships where status='active' group by heart_stone_id having count(distinct user_id)=2 limit 1;
 if p.heart_stone_id is null then raise exception 'Need a connected pair';end if;
 perform set_config('test.hs',p.heart_stone_id::text,true);perform set_config('test.a',p.ids[1]::text,true);perform set_config('test.b',p.ids[2]::text,true);
end $$;
set local role authenticated;
do $$declare hs uuid:=current_setting('test.hs')::uuid;a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;d date:=current_date+330;x jsonb;denied boolean;begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.set_shared_availability(hs,b,a,d,'America/New_York',true);
 perform public.set_shared_availability(hs,b,a,d,'America/New_York',true);
 x:=public.list_shared_availability(hs,a);
 if (select count(*) from jsonb_array_elements(x) r where r->>'day'=d::text and r->>'owner_id'=a::text)<>1 then raise exception 'Idempotency failed';end if;
 if x::text like '%title%' or x::text like '%note%' then raise exception 'Private calendar fields exposed';end if;
 denied:=false;begin perform 1 from hs_availability_internal.hearts;exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Direct table access';end if;
 denied:=false;begin perform public.set_shared_availability(hs,b,b,d,'UTC',true);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Wrong account accepted';end if;
 denied:=false;begin perform public.set_shared_availability(hs,b,a,current_date-2,'UTC',true);exception when others then denied:=true;end;if not denied then raise exception 'Past date accepted';end if;
 denied:=false;begin perform public.set_shared_availability(hs,b,a,d,'Invalid/Timezone',true);exception when others then denied:=true;end;if not denied then raise exception 'Invalid timezone accepted';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 x:=public.list_shared_availability(hs,b);if not x::text like '%'||a::text||'%' then raise exception 'Partner cannot see heart';end if;
 perform public.set_shared_availability(hs,a,b,d,'UTC',false);
 x:=public.list_shared_availability(hs,b);if not x::text like '%'||a::text||'%' then raise exception 'Partner removed owner heart';end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 denied:=false;begin perform public.list_shared_availability(hs,auth.uid());exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Stranger saw availability';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.set_shared_availability(hs,b,a,d,'UTC',false);
 x:=public.list_shared_availability(hs,a);if exists(select 1 from jsonb_array_elements(x) r where r->>'day'=d::text and r->>'owner_id'=a::text) then raise exception 'Removal failed';end if;
 perform public.set_shared_availability(hs,b,a,d,'UTC',true);
end $$;
reset role;
update hs_availability_internal.hearts set expires_at=now()-interval '1 second' where heart_stone_id=current_setting('test.hs')::uuid and owner_id=current_setting('test.a')::uuid and day=current_date+330;
set local role authenticated;
do $$declare x jsonb;begin
 perform set_config('request.jwt.claim.sub',current_setting('test.b'),true);
 x:=public.list_shared_availability(current_setting('test.hs')::uuid,current_setting('test.b')::uuid);
 if exists(select 1 from jsonb_array_elements(x) r where r->>'day'=(current_date+330)::text and r->>'owner_id'=current_setting('test.a')) then raise exception 'Expired heart visible';end if;
end $$;
reset role;
select 'PASS: partner visibility, idempotency, owner-only removal, account/stranger denial, private-table denial, date/timezone validation and expiry; all writes rolled back' as result;
rollback;
