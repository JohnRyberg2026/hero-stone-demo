-- Database-owner runner. Every availability write is rolled back; no notifications.
begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();h uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Availability audit rollback fixture 20261107"}'),(b,'{"first_name":"Availability audit rollback fixture 20261107"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 perform set_config('test.hs',h::text,true);perform set_config('test.a',a::text,true);perform set_config('test.b',b::text,true);
end $fixture$;
set local role authenticated;
do $$declare hs uuid:=current_setting('test.hs')::uuid;a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;d date:=current_date+330;x jsonb;denied boolean;begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.role','authenticated',true);
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
-- Membership changes revoke both directions; reactivation alone must not reshare.
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;h uuid:=current_setting('test.hs')::uuid;
begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 perform public.my_private_calendar(a,0,'{"version":1,"events":[{"id":"private","title":"Private entry retained","kind":"personal","day":"2027-01-10"}],"hearts":[]}');
 perform public.set_shared_availability(h,b,a,current_date+5,'UTC',true);
end $check$;
reset role;
update public.heart_stone_memberships set status='left' where heart_stone_id=current_setting('test.hs')::uuid and user_id=current_setting('test.a')::uuid;
set local role authenticated;
do $check$
begin
 perform set_config('request.jwt.claim.sub',current_setting('test.b'),true);
 if jsonb_array_length(public.list_shared_availability(current_setting('test.hs')::uuid,current_setting('test.b')::uuid))<>0 then raise exception 'Departed owner share remained visible';end if;
end $check$;
reset role;
update public.heart_stone_memberships set status='active' where heart_stone_id=current_setting('test.hs')::uuid and user_id=current_setting('test.a')::uuid;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;h uuid:=current_setting('test.hs')::uuid;x jsonb;
begin
 perform set_config('request.jwt.claim.sub',b::text,true);
 if jsonb_array_length(public.list_shared_availability(h,b))<>0 then raise exception 'Owner reactivation silently reshared';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.my_private_calendar(a);
 if x#>>'{calendar,events,0,title}'<>'Private entry retained' then raise exception 'Membership change altered private calendar';end if;
 perform public.set_shared_availability(h,b,a,current_date+5,'UTC',true);
 if jsonb_array_length(public.list_shared_availability(h,a))<>1 then raise exception 'Explicit reshare failed';end if;
end $check$;
reset role;
-- An unchanged status and routine metadata update must not revoke consent.
update public.heart_stone_memberships set status=status,joined_at=coalesce(joined_at,now()) where heart_stone_id=current_setting('test.hs')::uuid and user_id=current_setting('test.a')::uuid;
set local role authenticated;
do $check$
begin
 perform set_config('request.jwt.claim.sub',current_setting('test.b'),true);
 if jsonb_array_length(public.list_shared_availability(current_setting('test.hs')::uuid,current_setting('test.b')::uuid))<>1 then raise exception 'Unchanged status revoked share';end if;
end $check$;
reset role;
update public.heart_stone_memberships set status='left' where heart_stone_id=current_setting('test.hs')::uuid and user_id=current_setting('test.b')::uuid;
update public.heart_stone_memberships set status='active' where heart_stone_id=current_setting('test.hs')::uuid and user_id=current_setting('test.b')::uuid;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;h uuid:=current_setting('test.hs')::uuid;
begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 if jsonb_array_length(public.list_shared_availability(h,a))<>0 then raise exception 'Recipient reactivation silently reshared';end if;
 perform public.set_shared_availability(h,b,a,current_date+5,'UTC',true);
 if jsonb_array_length(public.list_shared_availability(h,a))<>1 then raise exception 'Reshare after recipient return failed';end if;
 if has_function_privilege('authenticated','hs_availability_internal.revoke_membership_hearts()','execute') then raise exception 'Client can invoke revocation trigger directly';end if;
end $check$;
reset role;
select 'PASS: date-only sharing, owner removal, outsider/account denial, expiry, owner and recipient revocation, no silent reshare, explicit reshare, metadata stability and private-calendar retention; all synthetic writes rolled back' as result;
rollback;
