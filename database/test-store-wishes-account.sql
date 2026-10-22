-- Run after schema in the SAME transaction. Always rollback: no real account data used.
insert into auth.users(id) values('f0000000-0000-0000-0000-000000000001'),('f0000000-0000-0000-0000-000000000002'),('f0000000-0000-0000-0000-000000000003');
insert into public.profiles(id,first_name) values('f0000000-0000-0000-0000-000000000001','Wish Test Owner'),('f0000000-0000-0000-0000-000000000002','Wish Test Recipient'),('f0000000-0000-0000-0000-000000000003','Wish Test Outsider') on conflict(id) do nothing;
insert into public.heart_stones(id,created_by_user_id,status) values('f0000000-0000-0000-0000-000000000010','f0000000-0000-0000-0000-000000000001','connected');
insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values('f0000000-0000-0000-0000-000000000010','f0000000-0000-0000-0000-000000000001','active'),('f0000000-0000-0000-0000-000000000010','f0000000-0000-0000-0000-000000000002','active');
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
insert into public.quest_wishes(owner_id,id,name,category,destination,preference,notes) values(auth.uid(),'test','Quiet B&B','stays','mine','ask','PRIVATE OWNER NOTE');
insert into public.quest_wish_shares(owner_id,wish_id,heart_stone_id,recipient_id,wish_revision,name,category,url,preference,shared_note) values(auth.uid(),'test','f0000000-0000-0000-0000-000000000010','f0000000-0000-0000-0000-000000000002',1,'Client spoof','intimate','','choose','A balcony would be lovely');
do $$begin
 if (select name from public.quest_wish_shares limit 1)<>'Quiet B&B' then raise exception 'Snapshot spoof not overwritten';end if;
 if exists(select 1 from public.quest_wish_shares where to_jsonb(quest_wish_shares)::text like '%PRIVATE OWNER NOTE%') then raise exception 'Private note leaked';end if;
end$$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000002',true);
do $$begin
 if exists(select 1 from public.quest_wishes) then raise exception 'Recipient saw owner notes';end if;
 if (select count(*) from public.quest_wish_shares)<>1 then raise exception 'Recipient missing share';end if;
 delete from public.quest_wishes; if found then raise exception 'Recipient deleted owner wish';end if;
 delete from public.quest_wish_shares; if found then raise exception 'Recipient revoked owner share';end if;
end$$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000003',true);
do $$begin
 if exists(select 1 from public.quest_wish_shares) then raise exception 'Outsider saw share';end if;
 begin
 insert into public.quest_wishes(owner_id,id,name,category,destination,preference) values('f0000000-0000-0000-0000-000000000001','spoof','Spoof','stays','mine','ask');
 raise exception 'Spoof write permitted';
 exception when insufficient_privilege then null;end;
end$$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
update public.quest_wishes set name='New B&B' where id='test' and revision=1;
do $$begin
 update public.quest_wishes set name='Stale' where id='test' and revision=1;
 if found then raise exception 'Stale revision overwrite';end if;
end$$;
do $$begin
 begin
 insert into public.quest_wish_shares(owner_id,wish_id,heart_stone_id,recipient_id,wish_revision,name,category,url,preference) values(auth.uid(),'test','f0000000-0000-0000-0000-000000000010','f0000000-0000-0000-0000-000000000002',1,'','','','');
 raise exception 'Stale share permitted';
 exception when raise_exception then if sqlerrm not like 'Wish changed%' then raise;end if;end;
end$$;
reset role;
update public.heart_stone_memberships set status='left' where user_id='f0000000-0000-0000-0000-000000000001';
set local role authenticated;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000002',true);
do $$begin if exists(select 1 from public.quest_wish_shares) then raise exception 'Disconnected owner share still visible';end if;end$$;
select set_config('request.jwt.claim.sub','f0000000-0000-0000-0000-000000000001',true);
delete from public.quest_wishes where id='test';
do $$begin if exists(select 1 from public.quest_wish_shares) then raise exception 'Delete did not revoke shares';end if;end$$;
reset role;
