begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();h uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Memory paging rollback fixture 20261108"}'),(b,'{"first_name":"Memory paging rollback fixture 20261108"}'),(c,'{"first_name":"Memory paging rollback fixture 20261108"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 for n in 1..60 loop
  insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,started_at,completed_at)
  values(h,a,b,gen_random_uuid(),'Test','date','{}','Completed '||n,'Story','all','','accepted','2026-10-01 11:00:00+00','2026-10-01 12:00:00+00');
 end loop;
 perform set_config('test.page.a',a::text,true);perform set_config('test.page.b',b::text,true);perform set_config('test.page.c',c::text,true);perform set_config('test.page.h',h::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.page.a')::uuid;h uuid:=current_setting('test.page.h')::uuid;x jsonb;y jsonb;denied boolean;
begin
 perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.page_completed_moment_invitations(h);
 if jsonb_array_length(x)<>51 then raise exception 'Missing lookahead row';end if;
 perform set_config('test.page.cursorid',x#>>'{49,id}',true);perform set_config('test.page.cursordate',x#>>'{49,completed_at}',true);perform set_config('test.page.first',x::text,true);
 y:=public.page_completed_moment_invitations(h,(x#>>'{49,completed_at}')::timestamptz,(x#>>'{49,id}')::uuid);
 if jsonb_array_length(y)<>10 then raise exception 'Tied timestamp skipped or duplicated rows';end if;
 if exists(select 1 from jsonb_array_elements(x) with ordinality f(v,n) join jsonb_array_elements(y) s(v) on f.v->>'id'=s.v->>'id' where n<=50) then raise exception 'Duplicate page row';end if;
 if jsonb_array_length(public.page_completed_moment_invitations(h,(y#>>'{9,completed_at}')::timestamptz,(y#>>'{9,id}')::uuid))<>0 then raise exception 'End cursor did not finish';end if;
 denied:=false;begin perform public.page_completed_moment_invitations(h,null,gen_random_uuid());exception when invalid_parameter_value then denied:=true;end;if not denied then raise exception 'Half cursor accepted';end if;
 denied:=false;begin perform public.page_completed_moment_invitations(h,'infinity',gen_random_uuid());exception when invalid_parameter_value then denied:=true;end;if not denied then raise exception 'Infinite cursor accepted';end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.page.c'),true);
 denied:=false;begin perform public.page_completed_moment_invitations(h);exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Outsider page allowed';end if;
end $check$;
reset role;
insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint,status,started_at,completed_at)
values(current_setting('test.page.h')::uuid,current_setting('test.page.a')::uuid,current_setting('test.page.b')::uuid,gen_random_uuid(),'Test','date','{}','New completion','Story','all','','accepted','2026-10-02 11:00:00+00','2026-10-02 12:00:00+00');
set local role authenticated;
do $check$
declare h uuid:=current_setting('test.page.h')::uuid;x jsonb;y jsonb;
begin
 perform set_config('request.jwt.claim.sub',current_setting('test.page.a'),true);
 x:=public.page_completed_moment_invitations(h,current_setting('test.page.cursordate')::timestamptz,current_setting('test.page.cursorid')::uuid);
 if jsonb_array_length(x)<>10 then raise exception 'Newer completion disturbed older cursor';end if;
 y:=public.page_completed_moment_invitations(h);
 if y#>>'{0,title}'<>'New completion' then raise exception 'Refresh omitted newer completion';end if;
 perform set_config('request.jwt.claim.sub',current_setting('test.page.b'),true);
 if public.page_completed_moment_invitations(h)<>y then raise exception 'Partner page mismatch';end if;
end $check$;
reset role;
set local role anon;
do $check$ begin
 begin perform public.page_completed_moment_invitations(gen_random_uuid());raise exception 'Anonymous page allowed';exception when insufficient_privilege then null;end;
end $check$;
reset role;
rollback;
select 'PASS: 50-row pages plus lookahead, tied timestamps, no duplicates, end cursor, new completion stability, refresh, cursor validation and participant/outsider/anonymous boundaries; rollback complete' as result;
