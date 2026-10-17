-- DRAFT ONLY. Apply after demo_profile_requirements_guard.sql, following deployment review.
-- Supports the current main demo client; legacy alpha/composer/Wild clients need a separate guarded API before re-enabling.
begin;
do $check$
begin
 if to_regprocedure('heartstone_private.require_demo_profile_requirements(uuid)') is null then
   raise exception 'PROFILE_GUARD_REQUIRED';
 end if;
end;
$check$;

-- Client mutations must use the reviewed SECURITY DEFINER RPCs, which keep their own owner/membership checks.
-- SELECT grants and existing RLS are preserved here; read-policy review is still separate work.
revoke insert,update,delete,truncate,references,trigger on
 public.recommendation_requests,public.recommendations,public.adventures,public.adventure_steps
 from public,anon,authenticated;

-- The demo's definer functions can still call these internally as their owner.
-- They are no longer independent client entrypoints around the new profile guard.
revoke execute on function public.begin_alpha_quest(uuid,public.adventure_type,text,integer,text,text[],integer,text,integer) from public,anon,authenticated;
revoke execute on function public.generate_recommendations_v2(uuid,integer) from public,anon,authenticated;
revoke execute on function public.accept_alpha_recommendation(uuid) from public,anon,authenticated;
revoke execute on function public.choose_recommendation(uuid) from public,anon,authenticated;
revoke execute on function public.compose_date_quest(uuid,public.surprise_level,public.quest_reveal_mode) from public,anon,authenticated;
revoke execute on function public.create_wild_adventure(uuid,uuid,uuid,public.wild_adventure_intensity,public.wild_adventure_reveal_style) from public,anon,authenticated;

-- Owner-only profile editing stays available. Administrative privileges are not client editing permissions.
revoke all on public.user_onboarding_answers from public,anon;
revoke truncate,references,trigger on public.user_onboarding_answers from authenticated;
grant select,insert,update,delete on public.user_onboarding_answers to authenticated;
commit;
