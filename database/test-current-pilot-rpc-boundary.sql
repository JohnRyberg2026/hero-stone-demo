-- Read-only metadata and denied-call verification; no users or records created.
begin;
do $metadata$
declare signature text;table_name text;
begin
 foreach signature in array array[
 'public.my_date_quest_membership(uuid)',
 'public.cancel_moment_invitation_revision(uuid,uuid,integer,text)',
 'public.list_completed_moment_invitations(uuid,uuid)',
 'public.page_completed_moment_invitations(uuid,timestamp with time zone,uuid)'
 ] loop
  if to_regprocedure(signature) is null then raise exception 'Missing current RPC: %',signature;end if;
  if (select prosecdef from pg_proc where oid=to_regprocedure(signature)) then raise exception 'Public wrapper became privileged: %',signature;end if;
  if has_function_privilege('anon',signature,'EXECUTE') then raise exception 'Anonymous RPC grant: %',signature;end if;
  if not has_function_privilege('authenticated',signature,'EXECUTE') or not has_function_privilege('service_role',signature,'EXECUTE') then raise exception 'Required execution grant missing: %',signature;end if;
 end loop;
 foreach signature in array array[
 'hs_membership_internal.enroll_founders(uuid,text,uuid[])',
 'hs_membership_internal.preview_founding_enrollment(uuid,text,uuid[])'
 ] loop
  if has_function_privilege('authenticated',signature,'EXECUTE') or has_function_privilege('anon',signature,'EXECUTE') then raise exception 'Self-enrollment/admin preview grant: %',signature;end if;
 end loop;
 foreach table_name in array array[
 'hs_membership_internal.founding_limits','hs_membership_internal.founding_enrollments',
 'hs_membership_internal.founding_members','hs_pilot_internal.legacy_accounts'
 ] loop
  if has_table_privilege('authenticated',table_name,'SELECT,INSERT,UPDATE,DELETE')
   or has_table_privilege('anon',table_name,'SELECT,INSERT,UPDATE,DELETE') then raise exception 'Client private-table grant: %',table_name;end if;
 end loop;
end $metadata$;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true),
 set_config('request.jwt.claim.role','authenticated',true),set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $denial$
declare statement text;fake uuid:=current_setting('request.jwt.claim.sub')::uuid;
begin
 foreach statement in array array[
  format('select public.my_date_quest_membership(%L::uuid)',fake),
  format('select public.cancel_moment_invitation_revision(%L::uuid,%L::uuid,0,%L)',gen_random_uuid(),fake,''),
  format('select public.list_completed_moment_invitations(%L::uuid)',gen_random_uuid()),
  format('select public.page_completed_moment_invitations(%L::uuid)',gen_random_uuid())
 ] loop
  begin execute statement;raise exception 'Nonparticipant call succeeded: %',statement;exception when insufficient_privilege then null;end;
 end loop;
end $denial$;
reset role;
select set_config('request.jwt.claim.sub','',true),set_config('request.jwt.claim.role','anon',true),set_config('request.jwt.claims','{}',true);
set local role anon;
do $denial$
declare statement text;
begin
 foreach statement in array array[
  'select public.my_date_quest_membership(null::uuid)',
  'select public.cancel_moment_invitation_revision(null::uuid,null::uuid,0,'''')',
  'select public.list_completed_moment_invitations(null::uuid)',
  'select public.page_completed_moment_invitations(null::uuid)'
 ] loop
  begin execute statement;raise exception 'Signed-out call succeeded: %',statement;exception when insufficient_privilege then null;end;
 end loop;
end $denial$;
reset role;
rollback;
select 'PASS: current wrapper grants/security mode; no client roster/admin access; signed-out and signed-in nonparticipant denial. No test records created.' as result;
