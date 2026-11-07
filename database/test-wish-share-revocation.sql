-- Database owner runner; generated synthetic accounts only; no real wish records.
begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();h uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Wish audit rollback fixture 20261107"}'),(b,'{"first_name":"Wish audit rollback fixture 20261107"}'),(c,'{"first_name":"Wish audit rollback fixture 20261107"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 perform set_config('test.a',a::text,true);perform set_config('test.b',b::text,true);perform set_config('test.c',c::text,true);perform set_config('test.h',h::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;h uuid:=current_setting('test.h')::uuid;
begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claim.sub',a::text,true);
 insert into public.quest_wishes(owner_id,id,name,category,destination,preference,notes) values(a,'audit','Private wish retained','experience','mine','ask','PRIVATE NOTES STAY HERE');
 insert into public.quest_wish_shares(owner_id,wish_id,heart_stone_id,recipient_id,wish_revision,name,category,url,preference,shared_note) values(a,'audit',h,b,1,'Spoof title','intimate','','choose','Only this note is shared');
 if (select name from public.quest_wish_shares where owner_id=a and wish_id='audit')<>'Private wish retained' then raise exception 'Snapshot spoof accepted';end if;
 if exists(select 1 from public.quest_wish_shares where to_jsonb(quest_wish_shares)::text like '%PRIVATE NOTES STAY HERE%') then raise exception 'Private notes leaked';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if (select count(*) from public.quest_wish_shares)<>1 then raise exception 'Recipient share missing';end if;
 if exists(select 1 from public.quest_wishes) then raise exception 'Recipient saw private owner wish';end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.c'),true);
 if exists(select 1 from public.quest_wish_shares) then raise exception 'Outsider saw snapshot';end if;
end $check$;
reset role;
-- Metadata and unchanged statuses preserve an intentionally shared snapshot.
update public.heart_stone_memberships set status=status,joined_at=coalesce(joined_at,now()) where heart_stone_id=current_setting('test.h')::uuid;
update public.heart_stones set status=status where id=current_setting('test.h')::uuid;
set local role authenticated;
do $check$
begin
 perform set_config('request.jwt.claim.sub',current_setting('test.b'),true);
 if (select count(*) from public.quest_wish_shares)<>1 then raise exception 'Unchanged connection revoked share';end if;
end $check$;
reset role;
-- Recipient leave/return cannot reactivate old consent.
update public.heart_stone_memberships set status='left' where heart_stone_id=current_setting('test.h')::uuid and user_id=current_setting('test.b')::uuid;
update public.heart_stone_memberships set status='active' where heart_stone_id=current_setting('test.h')::uuid and user_id=current_setting('test.b')::uuid;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;h uuid:=current_setting('test.h')::uuid;
begin
 perform set_config('request.jwt.claim.sub',b::text,true);
 if exists(select 1 from public.quest_wish_shares) then raise exception 'Recipient return silently reshared';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 if not exists(select 1 from public.quest_wish_shares where revoked_at is not null) then raise exception 'Owner missing ended snapshot';end if;
 if (select notes from public.quest_wishes where id='audit')<>'PRIVATE NOTES STAY HERE' then raise exception 'Private wish altered by revocation';end if;
 insert into public.quest_wishes(owner_id,id,name,category,destination,preference) values(a,'audit-reshare-1','New explicit share','experience','mine','ask');
 insert into public.quest_wish_shares(owner_id,wish_id,heart_stone_id,recipient_id,wish_revision,name,category,url,preference) values(a,'audit-reshare-1',h,b,1,'','','','');
 perform set_config('request.jwt.claim.sub',b::text,true);
 if (select count(*) from public.quest_wish_shares)<>1 then raise exception 'Explicit reshare after recipient return failed';end if;
end $check$;
reset role;
-- Owner leave/return also ends the recipient's read access.
update public.heart_stone_memberships set status='left' where heart_stone_id=current_setting('test.h')::uuid and user_id=current_setting('test.a')::uuid;
update public.heart_stone_memberships set status='active' where heart_stone_id=current_setting('test.h')::uuid and user_id=current_setting('test.a')::uuid;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;h uuid:=current_setting('test.h')::uuid;
begin
 perform set_config('request.jwt.claim.sub',b::text,true);
 if exists(select 1 from public.quest_wish_shares) then raise exception 'Owner return silently reshared';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 insert into public.quest_wishes(owner_id,id,name,category,destination,preference) values(a,'audit-reshare-2','New explicit share','experience','mine','ask');
 insert into public.quest_wish_shares(owner_id,wish_id,heart_stone_id,recipient_id,wish_revision,name,category,url,preference) values(a,'audit-reshare-2',h,b,1,'','','','');
end $check$;
reset role;
-- Relationship status changes must revoke even when membership rows remain active.
update public.heart_stones set status='disconnected' where id=current_setting('test.h')::uuid;
update public.heart_stones set status='connected' where id=current_setting('test.h')::uuid;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.a')::uuid;b uuid:=current_setting('test.b')::uuid;h uuid:=current_setting('test.h')::uuid;
begin
 perform set_config('request.jwt.claim.sub',b::text,true);
 if exists(select 1 from public.quest_wish_shares) then raise exception 'Connection return silently reshared';end if;
 -- Recipient cannot remove the owner's ended snapshot or revive it via UPDATE.
 if has_table_privilege('authenticated','public.quest_wish_shares','UPDATE') then raise exception 'Recipient can update revocation marker';end if;
 if has_table_privilege('authenticated','public.quest_wish_shares','TRUNCATE') or has_table_privilege('authenticated','public.quest_wishes','TRUNCATE') then raise exception 'Client retains table-wide truncate';end if;
 if has_table_privilege('authenticated','public.quest_wish_shares','TRIGGER') or has_table_privilege('authenticated','public.quest_wishes','TRIGGER') then raise exception 'Client retains trigger management';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 insert into public.quest_wishes(owner_id,id,name,category,destination,preference) values(a,'audit-reshare-3','New explicit share','experience','mine','ask');
 insert into public.quest_wish_shares(owner_id,wish_id,heart_stone_id,recipient_id,wish_revision,name,category,url,preference) values(a,'audit-reshare-3',h,b,1,'','','','');
 perform set_config('request.jwt.claim.sub',b::text,true);
 if (select count(*) from public.quest_wish_shares)<>1 then raise exception 'Explicit reshare after reconnect failed';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);

end $check$;
reset role;
rollback;
select 'PASS: private-note exclusion, snapshot integrity, owner/recipient/outsider isolation, both membership transitions, connection transitions, no silent reshare, explicit reshare, unchanged metadata and no client UPDATE grant; all synthetic writes rolled back.' as result;
