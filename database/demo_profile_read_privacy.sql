-- DRAFT ONLY: review/apply after both profile guard and access-hardening drafts.
-- Restrictive policies combine with existing membership policies; they do not replace them.
begin;
do $check$
begin
 if to_regprocedure('heartstone_private.require_demo_profile_requirements(uuid)') is null then raise exception 'PROFILE_GUARD_REQUIRED'; end if;
end;
$check$;

create policy profile_request_creator_read on public.recommendation_requests
as restrictive for select to authenticated
using (created_by_user_id=(select auth.uid()));

-- Sent demo envelope metadata remains readable through the existing membership policy.
-- Full row/column masking for cinematic surprise is a separate API change; see the review document.
create policy profile_demo_draft_adventure_read on public.adventures
as restrictive for select to authenticated
using (not coalesce(is_demo,false) or created_by_user_id=(select auth.uid()) or invitation_style is not null);

create policy profile_recommendation_private_read on public.recommendations
as restrictive for select to authenticated
using (
 exists(select 1 from public.recommendation_requests q
   where q.id=recommendations.request_id and q.heart_stone_id=recommendations.heart_stone_id
   and q.created_by_user_id=(select auth.uid()))
 or exists(select 1 from public.adventures a
   where a.source_recommendation_id=recommendations.id and a.heart_stone_id=recommendations.heart_stone_id
   and (
     (coalesce(a.is_demo,false) and a.invitation_style is not null and a.adventure_revealed_at is not null)
     or (not coalesce(a.is_demo,false) and a.status in ('active','completed'))
   ))
);

create policy profile_demo_step_reveal_read on public.adventure_steps
as restrictive for select to authenticated
using (exists(select 1 from public.adventures a where a.id=adventure_steps.adventure_id
 and (not coalesce(a.is_demo,false) or a.created_by_user_id=(select auth.uid()) or a.adventure_revealed_at is not null)));

-- This older definer RPC returns draft recommendations outside RLS. Current index.html does not call it.
-- Legacy callers need a separately reviewed, filtered replacement before this endpoint is re-enabled.
revoke execute on function public.get_alpha_quest_state(uuid) from public,anon,authenticated;
commit;
