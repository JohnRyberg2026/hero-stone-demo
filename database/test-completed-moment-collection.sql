begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();h uuid:=gen_random_uuid();i uuid;
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Memory collection rollback fixture 20261108"}'),(b,'{"first_name":"Memory collection rollback fixture 20261108"}'),(c,'{"first_name":"Memory collection rollback fixture 20261108"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 for n in 1..55 loop
  insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status)
  values(h,b,a,gen_random_uuid(),'Test','date','{}','Active reply','Story','all','','pending');
 end loop;
 for n in 1..51 loop
  insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,created_at,started_at,completed_at)
  values(h,a,b,gen_random_uuid(),'Test','date','{}','Completed '||n,'Story','all','','accepted',now()-(n+2)*interval '1 day',now()-(n+1)*interval '1 day',now()-n*interval '1 day')
  returning id into i;
  if n=1 then perform set_config('test.memory.newest',i::text,true);end if;
  if n=51 then perform set_config('test.memory.oldest',i::text,true);end if;
 end loop;
 perform set_config('test.memory.a',a::text,true);perform set_config('test.memory.b',b::text,true);perform set_config('test.memory.c',c::text,true);perform set_config('test.memory.h',h::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.memory.a')::uuid;b uuid:=current_setting('test.memory.b')::uuid;c uuid:=current_setting('test.memory.c')::uuid;h uuid:=current_setting('test.memory.h')::uuid;x jsonb;y jsonb;
begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.list_moment_invitations(h);
 if jsonb_array_length(x)<>50 or exists(select 1 from jsonb_array_elements(x) v where v->>'status'<>'pending') then raise exception 'Active fixture did not fill capped invitation view';end if;
 x:=public.list_completed_moment_invitations(h);
 if jsonb_array_length(x)<>50 or x#>>'{0,id}'<>current_setting('test.memory.newest') then raise exception 'Separate memory ordering/limit wrong';end if;
 if exists(select 1 from jsonb_array_elements(x) v where v->>'completed_at' is null or v->>'status'<>'accepted' or v ? 'private_note' or v ? 'memory') then raise exception 'Collection mixed active/private records';end if;
 y:=public.list_completed_moment_invitations(h,current_setting('test.memory.oldest')::uuid);
 if jsonb_array_length(y)<>1 or y#>>'{0,id}'<>current_setting('test.memory.oldest') then raise exception 'Selected completed lookup still capped by collection';end if;
 if public.list_completed_moment_invitations(h,gen_random_uuid())<>'[]'::jsonb then raise exception 'Unknown item returned data';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if public.list_completed_moment_invitations(h)<>x then raise exception 'Participant collection mismatch';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 begin perform public.list_completed_moment_invitations(h,current_setting('test.memory.oldest')::uuid);raise exception 'Outsider memory collection readable';exception when insufficient_privilege then null;end;
end $check$;
reset role;
update public.heart_stone_memberships set status='left' where heart_stone_id=current_setting('test.memory.h')::uuid and user_id=current_setting('test.memory.b')::uuid;
set local role authenticated;
do $check$ begin
 perform set_config('request.jwt.claim.sub',current_setting('test.memory.a'),true);
 if public.list_completed_moment_invitations(current_setting('test.memory.h')::uuid)<>'[]'::jsonb then raise exception 'Inactive pair collection disclosed';end if;
end $check$;
reset role;
set local role anon;
do $check$ begin
 begin perform public.list_completed_moment_invitations(gen_random_uuid());raise exception 'Anonymous collection allowed';exception when insufficient_privilege then null;end;
end $check$;
reset role;
rollback;
select 'PASS: completed collection survives 55 active invitations; latest-50 completion order; exact selected item lookup; participant/outsider/inactive/anonymous boundaries; rollback complete' as result;
