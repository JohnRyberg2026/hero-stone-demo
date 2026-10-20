-- Run as database owner. Uses existing two-member connection; all writes roll back.

begin;
do $$
declare pair record;
begin
 select heart_stone_id,array_agg(user_id order by user_id) ids into pair
 from public.heart_stone_memberships where status='active' group by heart_stone_id having count(distinct user_id)=2 limit 1;
 if pair.heart_stone_id is null then raise exception 'Need a two-member test connection'; end if;
 perform set_config('test.hs',pair.heart_stone_id::text,true);
 perform set_config('test.sender',pair.ids[1]::text,true);
 perform set_config('test.recipient',pair.ids[2]::text,true);
end $$;
set local role authenticated;
do $$
declare
 hs uuid:=current_setting('test.hs')::uuid;
 sender uuid:=current_setting('test.sender')::uuid;
 recipient uuid:=current_setting('test.recipient')::uuid;
 req uuid:=gen_random_uuid(); iid uuid; iid2 uuid; x jsonb; denied boolean;
begin
 perform set_config('request.jwt.claim.sub',sender::text,true);
 iid:=public.send_moment_invitation(hs,recipient,req,'TEST ONLY - rollback','date','{"whenMode":"together"}','SECRET TITLE','SECRET STORY','surprise','');
 iid2:=public.send_moment_invitation(hs,recipient,req,'TEST ONLY - rollback','date','{"whenMode":"together"}','SECRET TITLE','SECRET STORY','surprise','');
 if iid<>iid2 then raise exception 'Duplicate retry created another invitation'; end if;
 denied:=false;
 begin perform public.send_moment_invitation(hs,recipient,req,'Changed payload','date','{}','Changed','Changed','all',''); exception when others then denied:=true; end;
 if not denied then raise exception 'Idempotency payload mismatch allowed'; end if;
 x:=public.list_moment_invitations(hs);
 if not x::text like '%SECRET TITLE%' then raise exception 'Sender cannot see own title'; end if;
 denied:=false;
 begin perform public.respond_moment_invitation(iid,'accepted',''); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Sender answered own invitation'; end if;
 denied:=false;
 begin perform 1 from hs_invitation_internal.invitations; exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Direct secret table access allowed'; end if;
 perform set_config('request.jwt.claim.sub',recipient::text,true);
 x:=public.list_moment_invitations(hs);
 if x::text like '%SECRET TITLE%' or x::text like '%SECRET STORY%' then raise exception 'Surprise leaked before acceptance'; end if;
 perform public.respond_moment_invitation(iid,'accepted','');
 perform public.respond_moment_invitation(iid,'accepted','');
 x:=public.list_moment_invitations(hs);
 if not x::text like '%SECRET STORY%' then raise exception 'Accepted recipient cannot reveal'; end if;
 denied:=false;
 begin perform public.respond_moment_invitation(iid,'declined',''); exception when others then denied:=true; end;
 if not denied then raise exception 'Stale response overwrote accepted'; end if;
 perform public.cancel_moment_invitation(iid);
 x:=public.list_moment_invitations(hs);
 if x::text like '%SECRET STORY%' then raise exception 'Cancelled surprise still revealed'; end if;
 perform set_config('request.jwt.claim.sub',sender::text,true);
 iid2:=public.send_moment_invitation(hs,recipient,gen_random_uuid(),'Decline test','date','{}','Title','Story','all','');
 perform set_config('request.jwt.claim.sub',recipient::text,true);
 perform public.respond_moment_invitation(iid2,'declined','');
 denied:=false;
 begin perform public.respond_moment_invitation(iid2,'accepted',''); exception when others then denied:=true; end;
 if not denied then raise exception 'Closed decline accepted'; end if;
 perform set_config('request.jwt.claim.sub',sender::text,true);
 iid2:=public.send_moment_invitation(hs,recipient,gen_random_uuid(),'Reschedule test','date','{}','Title','Story','hint','A quiet moment');
 perform set_config('request.jwt.claim.sub',recipient::text,true);
 perform public.respond_moment_invitation(iid2,'reschedule','Saturday afternoon');
 x:=public.list_moment_invitations(hs);
 if not x::text like '%Saturday afternoon%' then raise exception 'Reschedule note missing'; end if;
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 denied:=false;
 begin perform public.list_moment_invitations(hs); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Outsider read allowed'; end if;
 denied:=false;
 begin perform public.respond_moment_invitation(iid2,'accepted',''); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Outsider response allowed'; end if;
 denied:=false;
 begin perform public.cancel_moment_invitation(iid2); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'Outsider cancellation allowed'; end if;
 if has_function_privilege('anon','public.list_moment_invitations(uuid)','EXECUTE') then raise exception 'Anonymous API allowed'; end if;
 perform set_config('request.jwt.claim.sub','',true);
 denied:=false;
 begin perform public.list_moment_invitations(hs); exception when insufficient_privilege then denied:=true; end;
 if not denied then raise exception 'No-user read allowed'; end if;
end $$;
reset role;
rollback;
select 'PASS: retry, payload mismatch, sender/recipient authorization, secret redaction, acceptance, stale response, cancellation, decline, reschedule, outsider and anonymous denial. Test writes rolled back.' as result;
