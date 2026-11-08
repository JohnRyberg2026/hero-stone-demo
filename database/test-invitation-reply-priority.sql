begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();h uuid:=gen_random_uuid();i uuid;
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Invitation priority rollback fixture 20261108"}'),(b,'{"first_name":"Invitation priority rollback fixture 20261108"}'),(c,'{"first_name":"Invitation priority rollback fixture 20261108"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 for n in 1..52 loop
  insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at)
  values(h,a,b,gen_random_uuid(),'Test','date','{}','Closed','Story','all','','cancelled',now()-n*interval '1 second');
 end loop;
 insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at)
 values(h,b,a,gen_random_uuid(),'Test','date','{}','Old incoming reply','Story','all','','pending',now()-interval '100 days') returning id into i;perform set_config('test.priority.incoming',i::text,true);
 insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at,schedule_proposal)
 values(h,a,b,gen_random_uuid(),'Test','date','{}','Time needs review','Story','all','','accepted',now()-interval '90 days',jsonb_build_object('status','pending','proposed_by',b)) returning id into i;perform set_config('test.priority.time',i::text,true);
 insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at)
 values(h,a,b,gen_random_uuid(),'Test','date','{}','Reschedule request','Story','all','','reschedule',now()-interval '80 days') returning id into i;perform set_config('test.priority.reschedule',i::text,true);
 insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at,started_at)
 values(h,a,b,gen_random_uuid(),'Test','date','{}','Underway','Story','all','','accepted',now()-interval '70 days',now()-interval '1 hour') returning id into i;perform set_config('test.priority.underway',i::text,true);
 insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at)
 values(h,a,b,gen_random_uuid(),'Test','date','{}','Upcoming','Story','all','','accepted',now()-interval '60 days') returning id into i;perform set_config('test.priority.upcoming',i::text,true);
 insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at)
 values(h,a,b,gen_random_uuid(),'Test','date','{}','Waiting for partner','Story','all','','pending',now()-interval '50 days') returning id into i;perform set_config('test.priority.waiting',i::text,true);
 perform set_config('test.priority.a',a::text,true);perform set_config('test.priority.b',b::text,true);perform set_config('test.priority.c',c::text,true);perform set_config('test.priority.h',h::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare x jsonb;a uuid:=current_setting('test.priority.a')::uuid;b uuid:=current_setting('test.priority.b')::uuid;c uuid:=current_setting('test.priority.c')::uuid;h uuid:=current_setting('test.priority.h')::uuid;
begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.list_moment_invitations(h);
 if jsonb_array_length(x)<>50 then raise exception 'Collection limit changed';end if;
 if x#>>'{0,id}'<>current_setting('test.priority.reschedule') or x#>>'{1,id}'<>current_setting('test.priority.time') or x#>>'{2,id}'<>current_setting('test.priority.incoming') then raise exception 'Old reply-needed items lost behind recent closed rows';end if;
 if x#>>'{3,id}'<>current_setting('test.priority.underway') or x#>>'{4,id}'<>current_setting('test.priority.upcoming') or x#>>'{5,id}'<>current_setting('test.priority.waiting') then raise exception 'Lifecycle ordering wrong';end if;
 if x#>>'{6,status}'<>'cancelled' then raise exception 'Closed items not last';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);x:=public.list_moment_invitations(h);
 if x#>>'{0,id}'<>current_setting('test.priority.waiting') then raise exception 'Priority not relative to caller';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 begin perform public.list_moment_invitations(h);raise exception 'Outsider collection readable';exception when insufficient_privilege then null;end;
end $check$;
reset role;
rollback;
select 'PASS: priorities apply before 50-row limit, old reply-needed items survive recent closed history, caller-relative order, lifecycle order and outsider denial; rollback complete' as result;
