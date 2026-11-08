begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();h uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Pending time rollback fixture 20261108"}'),(b,'{"first_name":"Pending time rollback fixture 20261108"}'),(c,'{"first_name":"Pending time rollback fixture 20261108"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 perform set_config('test.pending.a',a::text,true);perform set_config('test.pending.b',b::text,true);perform set_config('test.pending.c',c::text,true);perform set_config('test.pending.h',h::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.pending.a')::uuid;b uuid:=current_setting('test.pending.b')::uuid;c uuid:=current_setting('test.pending.c')::uuid;h uuid:=current_setting('test.pending.h')::uuid;i uuid;x jsonb;entry jsonb;d text:=(current_date+14)::text;d2 text:=(current_date+15)::text;
begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claim.sub',a::text,true);
 i:=public.send_checked_moment_invitation(a,h,b,gen_random_uuid(),'Test','date',jsonb_build_object('whenMode','specific','momentDate',d,'momentTime','18:00','momentZone','America/New_York'),'Title','Story','all','');
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.respond_moment_invitation_revision(i,0,'accepted','');
 perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.shared_moment_schedule(i,a,'propose',0,jsonb_build_object('date',d2,'time','19:00','zone','America/New_York','place','Test only','duration','One hour'));
 for actor in 1..2 loop
  perform set_config('request.jwt.claim.sub',(case when actor=1 then a else b end)::text,true);
  select v into entry from jsonb_array_elements(public.list_moment_invitations(h)) v where v->>'id'=i::text;
  if entry#>>'{time_change,status}'<>'pending' or entry#>>'{time_change,proposed_by}'<>a::text then raise exception 'Participant pending summary missing';end if;
  if (select count(*) from jsonb_object_keys(entry->'time_change'))<>2 then raise exception 'Extra proposal data exposed';end if;
  if entry#>>'{plan,momentDate}'<>d then raise exception 'Unconfirmed day replaced current calendar day';end if;
 end loop;
 perform set_config('request.jwt.claim.sub',c::text,true);
 begin perform public.list_moment_invitations(h);raise exception 'Outsider read pending summary';exception when insufficient_privilege then null;end;
 perform set_config('request.jwt.claim.sub',b::text,true);
 x:=public.shared_moment_schedule(i,b,'confirm',1);
 select v into entry from jsonb_array_elements(public.list_moment_invitations(h)) v where v->>'id'=i::text;
 if entry->'time_change'<>'null'::jsonb or entry#>>'{plan,momentDate}'<>d2 then raise exception 'Confirmation did not clear pending marker and update agreed day';end if;
end $check$;
reset role;
rollback;
select 'PASS: both participants see minimal pending summary; outsider denied; original day preserved until confirmation; marker clears after confirmation; rollback complete' as result;
