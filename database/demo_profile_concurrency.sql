-- DRAFT ONLY. Apply after the requirement guard and related access/read drafts, following review.
-- All protected actions and edits use transaction-held locks on existing parent rows.
begin;
do $check$
begin
 if to_regprocedure('heartstone_private.require_demo_profile_requirements(uuid)') is null then raise exception 'PROFILE_GUARD_REQUIRED'; end if;
end;
$check$;
create or replace function heartstone_private.lock_profile_answer_owner()
returns trigger language plpgsql security definer set search_path=pg_catalog
as $lock$
declare ids uuid[] := '{}'::uuid[];
begin
 if tg_op<>'INSERT' and left(old.question_key,19)='account_profile_v1_' then ids:=array_append(ids,old.user_id); end if;
 if tg_op<>'DELETE' and left(new.question_key,19)='account_profile_v1_' then ids:=array_append(ids,new.user_id); end if;
 -- Missing parent rows are allowed during account-deletion cascades; the planning guard itself fails closed.
 perform p.id from public.profiles p where p.id=any(ids) order by p.id for update;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$lock$;
revoke all on function heartstone_private.lock_profile_answer_owner() from public,anon,authenticated;
create trigger profile_answer_planning_lock before insert or update or delete on public.user_onboarding_answers
for each row execute function heartstone_private.lock_profile_answer_owner();

create or replace function heartstone_private.lock_profile_membership_context()
returns trigger language plpgsql security definer set search_path=pg_catalog
as $lock$
declare ids uuid[] := '{}'::uuid[];
begin
 if tg_op<>'INSERT' then ids:=array_append(ids,old.heart_stone_id); end if;
 if tg_op<>'DELETE' then ids:=array_append(ids,new.heart_stone_id); end if;
 perform h.id from public.heart_stones h where h.id=any(ids) order by h.id for update;
 if tg_op='DELETE' then return old; end if;
 return new;
end;
$lock$;
revoke all on function heartstone_private.lock_profile_membership_context() from public,anon,authenticated;
create trigger profile_membership_planning_lock before insert or update or delete on public.heart_stone_memberships
for each row execute function heartstone_private.lock_profile_membership_context();

create or replace function heartstone_private.require_demo_profile_requirements(p_heart_stone_id uuid)
returns void language plpgsql volatile security definer set search_path=pg_catalog
as $guard$
declare members uuid[]; caller uuid:=auth.uid(); profile_count integer;
begin
 if caller is null then raise exception 'AUTH_REQUIRED'; end if;
 -- The post-lock read must obtain a fresh committed snapshot rather than an older transaction snapshot.
 if current_setting('transaction_isolation')<>'read committed' then raise exception 'PLANNING_RETRY_REQUIRED'; end if;
 if not exists(select 1 from public.heart_stone_memberships m where m.heart_stone_id=p_heart_stone_id and m.user_id=caller and m.status='active') then raise exception 'PLANNING_UNAVAILABLE'; end if;
 -- Consistent order: couple parent, then both profile parents in UUID order.
 perform h.id from public.heart_stones h where h.id=p_heart_stone_id for update;
 if not found then raise exception 'PLANNING_UNAVAILABLE'; end if;
 select array_agg(distinct m.user_id) into members from public.heart_stone_memberships m where m.heart_stone_id=p_heart_stone_id and m.status='active';
 if coalesce(cardinality(members),0)<>2 or not(caller=any(members)) then raise exception 'PLANNING_UNAVAILABLE'; end if;
 perform p.id from public.profiles p where p.id=any(members) order by p.id for update;
 get diagnostics profile_count=row_count;
 if profile_count<>2 then raise exception 'PLANNING_UNAVAILABLE'; end if;
 -- This separate query in a volatile READ COMMITTED function sees edits committed while locks were awaited.
 if exists(select 1 from public.user_onboarding_answers a where a.user_id=any(members)
   and heartstone_private.profile_answer_requires_review(a.question_key,a.answer_json,a.skipped)) then
   raise exception 'PROFILE_REQUIREMENTS_UNVERIFIED';
 end if;
end;
$guard$;
revoke all on function heartstone_private.require_demo_profile_requirements(uuid) from public,anon,authenticated;
commit;
