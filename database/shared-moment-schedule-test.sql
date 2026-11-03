begin;
do $$
declare a uuid;b uuid;h uuid;i uuid:=gen_random_uuid(); r jsonb; details jsonb; denied boolean;
begin
 select x.user_id,y.user_id,x.heart_stone_id into a,b,h from public.heart_stone_memberships x join public.heart_stone_memberships y on x.heart_stone_id=y.heart_stone_id and x.user_id<>y.user_id where x.status='active' and y.status='active' limit 1;
 if a is null then raise exception 'No connected test pair';end if;
 insert into hs_invitation_internal.invitations(id,heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,status) values(i,h,a,b,gen_random_uuid(),'Test','date','{}','Test','Test','all','accepted');
 perform set_config('request.jwt.claim.sub',a::text,true);
 details:=jsonb_build_object('date',(current_date+7)::text,'time','18:00','zone','America/New_York','place','At home','duration','Two hours');
 r:=public.shared_moment_schedule(i,a,'propose',0,details);assert r->>'version'='1';assert r->'plan'='{}'::jsonb;
 denied:=false;begin perform public.shared_moment_schedule(i,a,'confirm',1);exception when others then denied:=true;end;assert denied,'self confirmation denied';
 denied:=false;begin perform public.begin_shared_moment(i,a,0);exception when others then denied:=true;end;assert denied,'pending schedule blocks begin';
 denied:=false;begin perform public.shared_moment_schedule(i,a,'propose',0,details);exception when others then denied:=true;end;assert denied,'stale proposal denied';
 denied:=false;begin perform public.shared_moment_schedule(i,b,'load');exception when others then denied:=true;end;assert denied,'wrong expected user denied';
 perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
 denied:=false;begin perform public.shared_moment_schedule(i,auth.uid(),'load');exception when others then denied:=true;end;assert denied,'unrelated user denied';
 perform set_config('request.jwt.claim.sub',b::text,true);
 r:=public.shared_moment_schedule(i,b,'confirm',1);assert r->'proposal'->>'status'='confirmed';assert r->'plan'->>'meetPlace'='At home';
 -- Either partner can propose a replacement; confirmation is invalidated.
 r:=public.shared_moment_schedule(i,b,'propose',2,details);assert r->'proposal'->>'status'='pending';
 perform set_config('request.jwt.claim.sub',a::text,true);
 r:=public.shared_moment_schedule(i,a,'withdraw',3);assert r->'proposal'='{}'::jsonb;assert r->'plan'->>'meetPlace'='At home';
 denied:=false;begin perform public.shared_moment_schedule(i,a,'propose',4,details||'{"date":"2000-01-01"}');exception when others then denied:=true;end;assert denied,'past proposal denied';
 denied:=false;begin perform public.begin_shared_moment(i,a,0);exception when others then denied:=true;end;assert denied,'old invitation revision cannot begin';
 perform public.begin_shared_moment(i,a,1);
 denied:=false;begin perform public.shared_moment_schedule(i,a,'propose',4,details);exception when others then denied:=true;end;assert denied,'started schedule immutable';
 assert not has_function_privilege('anon','public.shared_moment_schedule(uuid,uuid,text,integer,jsonb)','execute');
 assert not has_table_privilege('authenticated','hs_invitation_internal.invitations','update');
end;$$;
rollback;
