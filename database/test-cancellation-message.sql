begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();h uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values(a,'{"first_name":"Cancellation rollback fixture 20261108"}'),(b,'{"first_name":"Cancellation rollback fixture 20261108"}'),(c,'{"first_name":"Cancellation rollback fixture 20261108"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 perform set_config('test.cancel.a',a::text,true);perform set_config('test.cancel.b',b::text,true);perform set_config('test.cancel.c',c::text,true);perform set_config('test.cancel.h',h::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.cancel.a')::uuid;b uuid:=current_setting('test.cancel.b')::uuid;c uuid:=current_setting('test.cancel.c')::uuid;h uuid:=current_setting('test.cancel.h')::uuid;i uuid;j uuid;k uuid;x jsonb;denied boolean;
begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);perform set_config('request.jwt.claim.role','authenticated',true);perform set_config('request.jwt.claim.sub',a::text,true);
 i:=public.send_checked_moment_invitation(a,h,b,gen_random_uuid(),'Test','date','{}','Title','Story','all','');
 j:=public.send_checked_moment_invitation(a,h,b,gen_random_uuid(),'Test','date','{}','Title','Story','all','');
 k:=public.send_checked_moment_invitation(a,h,b,gen_random_uuid(),'Test','date','{}','Title','Story','all','');
 perform set_config('request.jwt.claim.sub',b::text,true);
 perform public.respond_moment_invitation_revision(i,0,'accepted','');perform public.respond_moment_invitation_revision(j,0,'accepted','');perform public.respond_moment_invitation_revision(k,0,'accepted','');
 denied:=false;begin perform public.cancel_moment_invitation_revision(i,a,0,'Spoof');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Spoofed account accepted';end if;
 denied:=false;begin perform public.cancel_moment_invitation_revision(i,null,0,'Spoof');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Null expected account accepted';end if;
 denied:=false;begin perform public.cancel_moment_invitation_revision(i,b,4,'Stale');exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Stale revision accepted';end if;
 denied:=false;begin perform public.cancel_moment_invitation_revision(i,b,0,repeat('x',401));exception when invalid_parameter_value then denied:=true;end;if not denied then raise exception 'Oversized note accepted';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 denied:=false;begin perform public.cancel_moment_invitation_revision(i,c,0,'Outsider');exception when insufficient_privilege then denied:=true;end;if not denied then raise exception 'Outsider cancellation accepted';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if public.cancel_moment_invitation_revision(i,b,0,'  Let’s find another day.  ')<>'cancelled' then raise exception 'Recipient cancellation failed';end if;
 if public.cancel_moment_invitation_revision(i,b,0,'Let’s find another day.')<>'cancelled' then raise exception 'Safe retry failed';end if;
 denied:=false;begin perform public.cancel_moment_invitation_revision(i,b,0,'Replacement');exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Retry replaced note';end if;
 x:=public.list_moment_invitations(h);
 if not exists(select 1 from jsonb_array_elements(x) v where v->>'id'=i::text and v->>'status'='cancelled' and v->>'cancellation_note'='Let’s find another day.') then raise exception 'Recipient saved cancellation missing';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 x:=public.list_moment_invitations(h);
 if not exists(select 1 from jsonb_array_elements(x) v where v->>'id'=i::text and v->>'status'='cancelled' and v->>'cancellation_note'='Let’s find another day.') then raise exception 'Sender saved cancellation missing';end if;
 denied:=false;begin perform public.cancel_moment_invitation_revision(i,a,0,'Overwrite');exception when serialization_failure then denied:=true;end;if not denied then raise exception 'Other participant replaced cancellation';end if;
 perform public.cancel_moment_invitation_revision(j,a,0,'');
 perform public.begin_shared_moment(k,a,0);perform public.finish_shared_moment(k,a,0);
 denied:=false;begin perform public.cancel_moment_invitation_revision(k,a,0,'Too late');exception when raise_exception then denied:=true;end;if not denied then raise exception 'Completed moment cancelled';end if;
 perform set_config('test.cancel.active',public.send_checked_moment_invitation(a,h,b,gen_random_uuid(),'Test','date','{}','Title','Story','all','')::text,true);
end $check$;
reset role;
update public.heart_stone_memberships set status='left' where heart_stone_id=current_setting('test.cancel.h')::uuid and user_id=current_setting('test.cancel.b')::uuid;
set local role authenticated;
do $check$ begin
 begin perform public.cancel_moment_invitation_revision(current_setting('test.cancel.active')::uuid,current_setting('test.cancel.a')::uuid,0,'Inactive');raise exception 'Inactive pair cancelled';exception when insufficient_privilege then null;end;
end $check$;
reset role;
set local role anon;
do $check$ begin
 begin perform public.cancel_moment_invitation_revision(gen_random_uuid(),gen_random_uuid(),0,'');raise exception 'Anonymous cancellation allowed';exception when insufficient_privilege then null;end;
end $check$;
reset role;
rollback;
select 'PASS: either participant cancellation, same-note retry, shared saved note, outsider/account/null/stale/oversized/completed/inactive/anonymous denial; fixtures rolled back' as result;
