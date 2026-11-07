-- Run as database owner. Synthetic accounts only; every test write rolls back.
begin;
do $fixture$
declare a uuid:=gen_random_uuid();b uuid:=gen_random_uuid();c uuid:=gen_random_uuid();h uuid:=gen_random_uuid();
begin
 insert into auth.users(id,raw_user_meta_data) values
 (a,'{"first_name":"Authorization audit rollback fixture 20261107"}'),
 (b,'{"first_name":"Authorization audit rollback fixture 20261107"}'),
 (c,'{"first_name":"Authorization audit rollback fixture 20261107"}');
 insert into public.heart_stones(id,created_by_user_id,status) values(h,a,'connected');
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(h,a,'active'),(h,b,'active');
 perform set_config('test.audit.a',a::text,true);perform set_config('test.audit.b',b::text,true);
 perform set_config('test.audit.c',c::text,true);perform set_config('test.audit.h',h::text,true);
end $fixture$;
set local role authenticated;
do $check$
declare
 a uuid:=current_setting('test.audit.a')::uuid;b uuid:=current_setting('test.audit.b')::uuid;
 c uuid:=current_setting('test.audit.c')::uuid;h uuid:=current_setting('test.audit.h')::uuid;
 i uuid;j uuid;req uuid:=gen_random_uuid();denied boolean;x jsonb;d jsonb;signature text;
 future_day text:=(current_date+14)::text;
begin
 perform set_config('request.jwt.claims','{"role":"authenticated"}',true);
 perform set_config('request.jwt.claim.role','authenticated',true);
 perform set_config('request.jwt.claim.sub',a::text,true);
 -- Missing/mismatched expected accounts must fail, including reads.
 denied:=false;begin perform public.my_moment_profile_picture(null,null);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Missing expected picture account accepted';end if;
 denied:=false;begin perform public.my_moment_profile_picture(b,'sun');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Other account picture write accepted';end if;
 if public.my_moment_profile_picture(a,'sun')<>'sun' then raise exception 'Owner picture save failed';end if;
 denied:=false;begin perform public.send_checked_moment_invitation(b,h,b,req,'Test','date','{}','Title','Story','all','');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Spoofed sender accepted';end if;
 i:=public.send_checked_moment_invitation(a,h,b,req,'Rollback only','date','{"whenMode":"together"}','AUDIT SECRET TITLE','AUDIT SECRET STORY','surprise','');
 if public.send_checked_moment_invitation(a,h,b,req,'Rollback only','date','{"whenMode":"together"}','AUDIT SECRET TITLE','AUDIT SECRET STORY','surprise','')<>i then raise exception 'Retry created duplicate';end if;
 perform set_config('test.audit.i',i::text,true);
 denied:=false;begin perform public.respond_moment_invitation_revision(i,0,'accepted','');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Sender responded to own invitation';end if;
 -- Direct secret table access must remain denied.
 denied:=false;begin perform 1 from hs_invitation_internal.invitations;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Direct invitation table readable';end if;
 denied:=false;begin perform 1 from hs_invitation_internal.moment_memories;exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Direct memory table readable';end if;
 perform public.my_private_calendar(a,0,'{"version":1,"events":[{"id":"audit","title":"Owner private calendar","kind":"personal","day":"2027-01-10"}],"hearts":[]}');
 -- Outsider is signed in, but is neither member nor invitation participant.
 perform set_config('request.jwt.claim.sub',c::text,true);
 denied:=false;begin perform public.list_moment_invitations(h);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider list allowed';end if;
 denied:=false;begin perform public.get_moment_invitation_partners(h);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider partner lookup allowed';end if;
 denied:=false;begin perform public.cancel_moment_invitation(i);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider cancellation allowed';end if;
 denied:=false;begin perform public.respond_moment_invitation_revision(i,0,'accepted','');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider reply allowed';end if;
 denied:=false;begin perform public.shared_moment_schedule(i,c,'load');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider schedule load allowed';end if;
 denied:=false;begin perform public.begin_shared_moment(i,c,0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider beginning allowed';end if;
 denied:=false;begin perform public.finish_shared_moment(i,c,0);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider closing allowed';end if;
 denied:=false;begin perform public.propose_moment_invitation_time(i,c,0,gen_random_uuid(),future_day,'18:00','America/New_York');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider revised time allowed';end if;
 denied:=false;begin perform public.my_private_calendar(a);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider calendar read allowed';end if;
 -- Recipient can accept, but cannot read the other person's private account records.
 perform set_config('request.jwt.claim.sub',b::text,true);
 x:=public.list_moment_invitations(h);
 if x::text like '%AUDIT SECRET TITLE%' or x::text like '%AUDIT SECRET STORY%' then raise exception 'Surprise revealed before acceptance';end if;
 perform public.respond_moment_invitation_revision(i,0,'accepted','');
 if public.my_moment_profile_picture(b)<>'initials' then raise exception 'Partner picture crossed accounts';end if;
 denied:=false;begin perform public.my_moment_profile_picture(a);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Partner private picture API spoof allowed';end if;
 x:=public.my_private_calendar(b);
 if jsonb_array_length(x->'calendar'->'events')<>0 then raise exception 'Partner saw owner calendar';end if;
 if exists(select 1 from public.hs_private_calendars where owner_id=a) then raise exception 'Calendar RLS exposed partner row';end if;
 denied:=false;begin perform public.my_private_calendar(a,1,'{"version":1,"events":[],"hearts":[]}');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Partner calendar overwrite allowed';end if;
 -- Proposal, partner confirmation, begin and finish use the authorized revision.
 perform set_config('request.jwt.claim.sub',a::text,true);
 d:=jsonb_build_object('date',future_day,'time','18:00','zone','America/New_York','place','Audit test only','duration','One hour');
 x:=public.shared_moment_schedule(i,a,'propose',0,d);
 denied:=false;begin perform public.shared_moment_schedule(i,a,'confirm',1);exception when others then denied:=true;end;
 if not denied then raise exception 'Self-confirmation allowed';end if;
 denied:=false;begin perform public.begin_shared_moment(i,a,0);exception when others then denied:=true;end;
 if not denied then raise exception 'Pending schedule allowed beginning';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 x:=public.shared_moment_schedule(i,b,'confirm',1);
 perform set_config('request.jwt.claim.sub',a::text,true);
 denied:=false;begin perform public.begin_shared_moment(i,a,0);exception when others then denied:=true;end;
 if not denied then raise exception 'Stale invitation revision accepted';end if;
 perform public.begin_shared_moment(i,a,1);perform public.finish_shared_moment(i,a,1);
 if public.my_shared_moment_memory(i,a,'AUDIT OWNER PRIVATE WORDS')<>'AUDIT OWNER PRIVATE WORDS' then raise exception 'Owner memory save failed';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);
 if public.my_shared_moment_memory(i,b)<>'' then raise exception 'Partner saw owner private memory';end if;
 perform public.my_shared_moment_memory(i,b,'AUDIT PARTNER PRIVATE WORDS');
 denied:=false;begin perform public.my_shared_moment_memory(i,a);exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Partner read with spoofed memory owner';end if;
 x:=public.list_moment_invitations(h);
 if x::text like '%PRIVATE WORDS%' then raise exception 'Private memory leaked into invitation list';end if;
 perform set_config('request.jwt.claim.sub',c::text,true);
 denied:=false;begin perform public.my_shared_moment_memory(i,c,'Spoof');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Outsider memory write allowed';end if;
 perform set_config('request.jwt.claim.sub',a::text,true);
 if public.my_shared_moment_memory(i,a)<>'AUDIT OWNER PRIVATE WORDS' then raise exception 'Separate memory overwritten';end if;
 -- Revised-time path rejects missing expected sender and accepts the correct sender.
 j:=public.send_checked_moment_invitation(a,h,b,gen_random_uuid(),'Rollback revised time','date','{}','Title','Story','all','');
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.respond_moment_invitation_revision(j,0,'reschedule','Later');
 perform set_config('request.jwt.claim.sub',a::text,true);
 denied:=false;begin perform public.propose_moment_invitation_time(j,null,0,gen_random_uuid(),future_day,'18:00','America/New_York');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Missing expected revised-time sender accepted';end if;
 if public.propose_moment_invitation_time(j,a,0,gen_random_uuid(),future_day,'18:00','America/New_York')<>1 then raise exception 'Authorized revised time failed';end if;
 perform set_config('request.jwt.claim.sub',b::text,true);perform public.respond_moment_invitation_revision(j,1,'accepted','');
end $check$;
reset role;
-- Only the synthetic fixture's membership is changed, within this transaction.
update public.heart_stone_memberships set status='left' where heart_stone_id=current_setting('test.audit.h')::uuid and user_id=current_setting('test.audit.b')::uuid;
set local role authenticated;
do $check$
declare a uuid:=current_setting('test.audit.a')::uuid;h uuid:=current_setting('test.audit.h')::uuid;i uuid:=current_setting('test.audit.i')::uuid;denied boolean;
begin
 perform set_config('request.jwt.claim.sub',a::text,true);
 if jsonb_array_length(public.list_moment_invitations(h))<>0 then raise exception 'Inactive pair invitations still listed';end if;
 denied:=false;begin perform public.shared_moment_schedule(i,a,'load');exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Inactive pair shared schedule access allowed';end if;
 -- Owner's private words are intentionally retained, scoped by invitation participant and auth.uid().
 if public.my_shared_moment_memory(i,a)<>'AUDIT OWNER PRIVATE WORDS' then raise exception 'Owner memory retention changed';end if;
end $check$;
reset role;
rollback;
select 'PASS: synthetic sender/recipient/outsider checks, private account separation, guarded lifecycle, revised time, inactive pair, and owner memory retention. All fixture data rolled back.' as result;
