-- Append after shared-date-server.sql inside BEGIN; always ROLLBACK.
-- Fixed fictional identities, no credentials, no external communications.
insert into auth.users(id,raw_user_meta_data) select ('77777777-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,jsonb_build_object('first_name','Fixture '||n) from generate_series(1,4) n;
insert into public.heart_stones(id,created_by_user_id,status) values
 ('88888888-0000-4000-8000-000000000001','77777777-0000-4000-8000-000000000001','connected');
insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values
 ('88888888-0000-4000-8000-000000000001','77777777-0000-4000-8000-000000000001','active'),
 ('88888888-0000-4000-8000-000000000001','77777777-0000-4000-8000-000000000002','active'),
 ('88888888-0000-4000-8000-000000000001','77777777-0000-4000-8000-000000000003','active');
insert into hs_shared_dates.verified_adults(user_id,verified_at,expires_at)
 select ('77777777-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid,now()-interval '1 day',now()+interval '1 day' from generate_series(1,4) n;
create function pg_temp.check_true(p_test boolean,p_message text) returns void language plpgsql as $$begin if p_test is distinct from true then raise exception 'TEST FAILED: %',p_message;end if;end;$$;
create function pg_temp.expect_error(p_sql text,p_like text) returns void language plpgsql as $$
begin
 begin execute p_sql;exception when others then
  if sqlerrm not like p_like then raise exception 'Wrong failure: % (expected %)',sqlerrm,p_like;end if;return;
 end;raise exception 'TEST FAILED: expected an error for %',p_sql;
end;$$;
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.expect_error('select * from hs_shared_dates.dates','permission denied%');
select pg_temp.expect_error('insert into hs_shared_dates.verified_adults values (auth.uid(),now(),now()+interval ''1 day'',null)','permission denied%');
select pg_temp.expect_error('select hs_shared_dates.require_adults(array[auth.uid()])','permission denied%');
select pg_temp.expect_error($q$select public.shared_date_action('create','77777777-0000-4000-8000-000000000002')$q$,'Sign in with the expected account');
select set_config('test.shared_payload','{"participants":["77777777-0000-4000-8000-000000000001","77777777-0000-4000-8000-000000000002","77777777-0000-4000-8000-000000000003"],"title":"Fixture dinner","when":"Tomorrow","meeting":"Park"}',true);
select set_config('test.shared_date',(public.shared_date_action('create',auth.uid(),p_payload=>current_setting('test.shared_payload')::jsonb,p_request_id=>'99999999-0000-4000-8000-000000000001')->>'id'),true);
select pg_temp.check_true(public.shared_date_action('create',auth.uid(),p_payload=>current_setting('test.shared_payload')::jsonb,p_request_id=>'99999999-0000-4000-8000-000000000001')->>'id'=current_setting('test.shared_date'),'create retries return same identity');
select pg_temp.expect_error($q$select public.shared_date_action('create',auth.uid(),p_payload=>jsonb_set(current_setting('test.shared_payload')::jsonb,'{title}','"Changed"'),p_request_id=>'99999999-0000-4000-8000-000000000001')$q$,'Request identity belongs%');
select pg_temp.check_true(public.shared_date_action('send',auth.uid(),current_setting('test.shared_date')::uuid,1,p_request_id=>'99999999-0000-4000-8000-000000000002')->>'state'='pending','send waits for invitees');
select pg_temp.expect_error($q$select public.shared_date_action('begin',auth.uid(),current_setting('test.shared_date')::uuid,1,p_request_id=>'99999999-0000-4000-8000-000000000003')$q$,'Every included%');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000004',true);
select pg_temp.expect_error($q$select public.shared_date_action('view',auth.uid(),current_setting('test.shared_date')::uuid)$q$,'Shared date unavailable');
select pg_temp.check_true(jsonb_array_length(public.shared_date_action('list',auth.uid()))=0,'outsider list stays empty');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000002',true);
select pg_temp.check_true(public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,1,'{"response":"accepted"}','99999999-0000-4000-8000-000000000004')->>'state'='pending','one acceptance is insufficient');
select pg_temp.expect_error($q$select public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,1,'{"response":"accepted","user_id":"77777777-0000-4000-8000-000000000003"}','99999999-0000-4000-8000-000000000005')$q$,'Choose your own response');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000003',true);
select pg_temp.check_true(public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,1,'{"response":"accepted"}','99999999-0000-4000-8000-000000000006')->>'state'='confirmed','all accepted confirms');
select pg_temp.check_true(public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,1,'{"response":"accepted"}','99999999-0000-4000-8000-000000000006')->>'state'='confirmed','accept retry does not repeat transition');
reset role;
update hs_shared_dates.verified_adults set revoked_at=now() where user_id='77777777-0000-4000-8000-000000000003';
set local role authenticated;
select pg_temp.expect_error($q$select public.shared_date_action('begin',auth.uid(),current_setting('test.shared_date')::uuid,1,p_request_id=>'99999999-0000-4000-8000-000000000007')$q$,'Every included person needs%');
select pg_temp.check_true(public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,1,'{"response":"withdrawn"}','99999999-0000-4000-8000-000000000008')->>'state'='closed','revoked participant may withdraw');
select pg_temp.check_true(not (public.shared_date_action('view',auth.uid(),current_setting('test.shared_date')::uuid) ? 'title'),'revoked user cannot read shared plan');
reset role;
update hs_shared_dates.verified_adults set revoked_at=null where user_id='77777777-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.check_true(public.shared_date_action('revise',auth.uid(),current_setting('test.shared_date')::uuid,1,current_setting('test.shared_payload')::jsonb,'99999999-0000-4000-8000-000000000009')->>'revision'='2','revision increments');
select pg_temp.check_true(not exists(select 1 from jsonb_array_elements(public.shared_date_action('view',auth.uid(),current_setting('test.shared_date')::uuid)->'participants') p where p->>'response'<>'pending'),'revision clears every acceptance');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000002',true);
select pg_temp.expect_error($q$select public.shared_date_action('view',auth.uid(),current_setting('test.shared_date')::uuid)$q$,'Shared date unavailable');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000001',true);
select public.shared_date_action('send',auth.uid(),current_setting('test.shared_date')::uuid,2,p_request_id=>'99999999-0000-4000-8000-000000000010');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000002',true);
select pg_temp.expect_error($q$select public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,1,'{"response":"accepted"}','99999999-0000-4000-8000-000000000011')$q$,'This date changed%');
select public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,2,'{"response":"accepted"}','99999999-0000-4000-8000-000000000012');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000003',true);
select public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,2,'{"response":"accepted"}','99999999-0000-4000-8000-000000000013');
select pg_temp.check_true(public.shared_date_action('begin',auth.uid(),current_setting('test.shared_date')::uuid,2,p_request_id=>'99999999-0000-4000-8000-000000000014')->>'state'='started','participant can begin confirmed round');
select pg_temp.check_true(public.shared_date_action('stop',auth.uid(),current_setting('test.shared_date')::uuid,2,p_request_id=>'99999999-0000-4000-8000-000000000015')->>'state'='stopped','participant can stop');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000001',true);
select set_config('test.pair_payload',jsonb_set(current_setting('test.shared_payload')::jsonb,'{participants}','["77777777-0000-4000-8000-000000000001","77777777-0000-4000-8000-000000000002"]')::text,true);
select public.shared_date_action('revise',auth.uid(),current_setting('test.shared_date')::uuid,2,current_setting('test.pair_payload')::jsonb,'99999999-0000-4000-8000-000000000016');
select public.shared_date_action('send',auth.uid(),current_setting('test.shared_date')::uuid,3,p_request_id=>'99999999-0000-4000-8000-000000000017');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000003',true);
select pg_temp.expect_error($q$select public.shared_date_action('view',auth.uid(),current_setting('test.shared_date')::uuid)$q$,'Shared date unavailable');
select pg_temp.expect_error($q$select public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,2,'{"response":"accepted"}','99999999-0000-4000-8000-000000000013')$q$,'Shared date unavailable');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000002',true);
select pg_temp.check_true(public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,3,'{"response":"accepted"}','99999999-0000-4000-8000-000000000018')->>'state'='confirmed','one-on-one uses same model');
reset role;
update public.heart_stone_memberships set status='left' where user_id='77777777-0000-4000-8000-000000000002';
set local role authenticated;
select pg_temp.expect_error($q$select public.shared_date_action('begin',auth.uid(),current_setting('test.shared_date')::uuid,3,p_request_id=>'99999999-0000-4000-8000-000000000019')$q$,'Every invitee needs%');
select pg_temp.check_true(not (public.shared_date_action('view',auth.uid(),current_setting('test.shared_date')::uuid) ? 'title'),'ended connection hides plan');
select pg_temp.check_true(public.shared_date_action('respond',auth.uid(),current_setting('test.shared_date')::uuid,3,'{"response":"withdrawn"}','99999999-0000-4000-8000-000000000020')->>'state'='closed','ended connection can still withdraw');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000001',true);
select set_config('test.other_date',(public.shared_date_action('create',auth.uid(),p_payload=>jsonb_set(current_setting('test.pair_payload')::jsonb,'{participants}','["77777777-0000-4000-8000-000000000001","77777777-0000-4000-8000-000000000003"]'),p_request_id=>'99999999-0000-4000-8000-000000000021')->>'id'),true);
select public.shared_date_action('send',auth.uid(),current_setting('test.other_date')::uuid,1,p_request_id=>'99999999-0000-4000-8000-000000000022');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000003',true);
select pg_temp.check_true(public.shared_date_action('respond',auth.uid(),current_setting('test.other_date')::uuid,1,'{"response":"reschedule"}','99999999-0000-4000-8000-000000000023')->>'state'='needs_revision','reschedule does not confirm');
select pg_temp.expect_error($q$select public.shared_date_action('begin',auth.uid(),current_setting('test.other_date')::uuid,1,p_request_id=>'99999999-0000-4000-8000-000000000024')$q$,'Every included%');
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000002',true);
select pg_temp.expect_error($q$select public.shared_date_action('view',auth.uid(),current_setting('test.other_date')::uuid)$q$,'Shared date unavailable');
reset role;
update hs_shared_dates.verified_adults set expires_at=now()-interval '1 hour' where user_id='77777777-0000-4000-8000-000000000003';
select set_config('request.jwt.claim.sub','77777777-0000-4000-8000-000000000001',true);
set local role authenticated;
select pg_temp.expect_error($q$select public.shared_date_action('create',auth.uid(),p_payload=>current_setting('test.shared_payload')::jsonb,p_request_id=>'99999999-0000-4000-8000-000000000025')$q$,'Every included person needs%');
select pg_temp.expect_error($q$select public.shared_date_action('create',auth.uid(),p_payload=>jsonb_set(current_setting('test.pair_payload')::jsonb,'{participants}','["77777777-0000-4000-8000-000000000001","77777777-0000-4000-8000-000000000001"]'),p_request_id=>'99999999-0000-4000-8000-000000000026')$q$,'Choose 2 to 20%');
set local role anon;
select pg_temp.expect_error($q$select public.shared_date_action('list','77777777-0000-4000-8000-000000000001')$q$,'permission denied%');
reset role;
select pg_temp.check_true(not has_table_privilege('authenticated','hs_shared_dates.verified_adults','INSERT'),'cannot self-verify');
select pg_temp.check_true(not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='hs_shared_dates' and c.relkind='r' and not c.relrowsecurity),'all tables have RLS');
select 'PASS: server participant, revision, eligibility, privacy and retry checks' as result;
