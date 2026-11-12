-- DRAFT: not applied to the live project. Reviewed deployment is a separate step.
-- Based on the six demo RPC definitions inspected on 2026-10-16.
begin;
create schema if not exists heartstone_private;
revoke all on schema heartstone_private from public, anon, authenticated;

create or replace function heartstone_private.profile_answer_requires_review(p_key text, p_answer jsonb, p_skipped boolean)
returns boolean language plpgsql immutable set search_path = pg_catalog
as $guard$
declare k text; v jsonb; none_value text;
begin
 if coalesce(p_skipped,false) or left(p_key,19) <> 'account_profile_v1_' then return false; end if;
 k := substr(p_key,20); v := p_answer->'value';
 if v is null or v='null'::jsonb then return false; end if;
 if k=any(array['avoid','food_needs','food_requirements','budget_notes','travel','transport','accessibility','physical_comfort_notes','hard_nos','hard_no_details','accommodation_details','ask_first','adventure_notes','surprise_notes','privacy_notes']) then
   if jsonb_typeof(v)='string' then return length(btrim(v#>>'{}', chr(9)||chr(10)||chr(11)||chr(12)||chr(13)||chr(32)||chr(160)||chr(5760)||chr(8192)||chr(8193)||chr(8194)||chr(8195)||chr(8196)||chr(8197)||chr(8198)||chr(8199)||chr(8200)||chr(8201)||chr(8202)||chr(8232)||chr(8233)||chr(8239)||chr(8287)||chr(12288)||chr(65279)))>0; end if;
   return true;
 end if;
 none_value := case k when 'transport_considerations' then 'Nothing in particular'
   when 'surprise_essentials' then 'Nothing—keep the surprise'
   when 'hard_no_categories' then 'Nothing comes to mind right now'
   when 'accommodation_needs' then 'No accommodations right now' else null end;
 if none_value is not null then
   if jsonb_typeof(v)<>'array' then return true; end if;
   return exists(select 1 from jsonb_array_elements(v) item where item is distinct from to_jsonb(none_value));
 end if;
 if k in ('past_place_1_feedback','past_place_2_feedback') then
   return v in (to_jsonb('Not for us'::text),to_jsonb('Never suggest again'::text));
 end if;
 return false;
end;
$guard$;
revoke all on function heartstone_private.profile_answer_requires_review(text,jsonb,boolean) from public,anon,authenticated;

-- Cross-member lookup is internal only. No partner IDs, keys, categories, counts, or answers leave this function.
create or replace function heartstone_private.require_demo_profile_requirements(p_heart_stone_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog
as $guard$
declare members uuid[]; caller uuid := auth.uid();
begin
 if caller is null then raise exception 'AUTH_REQUIRED'; end if;
 select array_agg(distinct m.user_id) into members
 from public.heart_stone_memberships m where m.heart_stone_id=p_heart_stone_id and m.status='active';
 if coalesce(cardinality(members),0)<>2 or not (caller=any(members)) then
   raise exception 'PLANNING_UNAVAILABLE';
 end if;
 if exists(select 1 from public.user_onboarding_answers a
   where a.user_id=any(members)
   and heartstone_private.profile_answer_requires_review(a.question_key,a.answer_json,a.skipped)) then
   raise exception 'PROFILE_REQUIREMENTS_UNVERIFIED';
 end if;
end;
$guard$;
revoke all on function heartstone_private.require_demo_profile_requirements(uuid) from public,anon,authenticated;

CREATE OR REPLACE FUNCTION public.begin_demo_quest(p_heart_stone_id uuid, p_adventure_type adventure_type, p_when_label text, p_available_minutes integer, p_budget_label text, p_mood text[] DEFAULT '{}'::text[], p_max_distance_minutes integer DEFAULT NULL::integer, p_optional_request text DEFAULT NULL::text, p_limit integer DEFAULT 3)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_request_id uuid;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

 perform heartstone_private.require_demo_profile_requirements(p_heart_stone_id);
  v_request_id := public.begin_alpha_quest(
    p_heart_stone_id,
    p_adventure_type,
    p_when_label,
    p_available_minutes,
    p_budget_label,
    p_mood,
    p_max_distance_minutes,
    p_optional_request,
    p_limit
  );

  update public.recommendation_requests
     set is_demo=true
   where id=v_request_id;

  update public.recommendations
     set is_demo=true
   where request_id=v_request_id;

  return v_request_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.propose_demo_recommendation(p_recommendation_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_rec public.recommendations%rowtype;
  v_req public.recommendation_requests%rowtype;
  v_adventure_id uuid;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into v_rec from public.recommendations where id=p_recommendation_id for update;
  if not found then raise exception 'RECOMMENDATION_NOT_FOUND'; end if;
  perform public.require_active_heart_stone_member(v_rec.heart_stone_id);
  select * into v_req from public.recommendation_requests where id=v_rec.request_id and heart_stone_id=v_rec.heart_stone_id;
  if not found or not coalesce(v_req.is_demo,false) then raise exception 'DEMO_REQUEST_REQUIRED'; end if;
 perform heartstone_private.require_demo_profile_requirements(v_rec.heart_stone_id);
  if exists(select 1 from public.adventures where heart_stone_id=v_rec.heart_stone_id and status in ('proposed','active')) then raise exception 'DEMO_ADVENTURE_ALREADY_EXISTS'; end if;
  insert into public.adventures(heart_stone_id,type,title,status,planned_for,estimated_duration_minutes,estimated_budget,recommendation_class,created_by_user_id,source_recommendation_id,is_demo)
  values(v_rec.heart_stone_id,v_req.adventure_type,v_rec.title,'proposed',now(),v_rec.estimated_duration_minutes,v_rec.estimated_budget,v_rec.recommendation_class,auth.uid(),v_rec.id,true)
  returning id into v_adventure_id;
  insert into public.adventure_steps(adventure_id,position,step_type,title,description,estimated_duration_minutes,status)
  values(v_adventure_id,1,'experience',v_rec.title,v_rec.summary,v_rec.estimated_duration_minutes,'planned');
  update public.recommendations set selected_at=now(),selected_by_user_id=auth.uid(),is_demo=true where id=v_rec.id;
  perform public.consume_recommendation_request(v_rec.request_id);
  return v_adventure_id;
end;$function$;

CREATE OR REPLACE FUNCTION public.refresh_demo_recommendations(p_request_id uuid, p_exclude_candidate_ids uuid[] DEFAULT '{}'::uuid[], p_limit integer DEFAULT 3)
 RETURNS SETOF recommendations
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
  v_req public.recommendation_requests%rowtype;
  v_rec public.recommendations%rowtype;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_limit < 1 or p_limit > 3 then raise exception 'LIMIT_OUT_OF_RANGE'; end if;

  select * into v_req
  from public.recommendation_requests
  where id=p_request_id
  for update;

  if not found then raise exception 'RECOMMENDATION_REQUEST_NOT_FOUND'; end if;
  if not public.is_active_heart_stone_member(v_req.heart_stone_id) then raise exception 'NOT_ACTIVE_HEART_STONE_MEMBER'; end if;
  if coalesce(v_req.is_demo,false) is not true then raise exception 'DEMO_REQUEST_REQUIRED'; end if;
  if v_req.created_by_user_id <> auth.uid() then raise exception 'REQUEST_OWNER_REQUIRED'; end if;

 perform heartstone_private.require_demo_profile_requirements(v_req.heart_stone_id);
  delete from public.recommendations
  where request_id=v_req.id and selected_at is null;

  for v_rec in
    select rr.*
    from (
      select e.candidate_id,
             e.total_score,
             e.couple_fit_score,
             e.context_score,
             e.novelty_score,
             row_number() over (order by e.total_score desc, e.novelty_score desc, e.candidate_id) as rn
      from public.recommendation_candidate_evaluations e
      where e.request_id=v_req.id
        and e.status='eligible'
        and not (e.candidate_id = any(coalesce(p_exclude_candidate_ids,'{}'::uuid[])))
      order by e.total_score desc, e.novelty_score desc, e.candidate_id
      limit p_limit
    ) ranked
    join public.discovery_candidates d on d.id=ranked.candidate_id
    cross join lateral (
      select gen_random_uuid() as id,
             v_req.id as request_id,
             v_req.heart_stone_id as heart_stone_id,
             case ranked.rn when 1 then 'best_match'::public.recommendation_class
                            when 2 then 'something_different'::public.recommendation_class
                            else 'wild_card'::public.recommendation_class end as recommendation_class,
             d.title,
             coalesce(d.summary,'A discovery chosen for this moment.') as summary,
             'A fresh option for this request.'::text as shared_reason,
             null::integer as estimated_duration_minutes,
             null::text as estimated_budget,
             case when d.locality is not null then d.locality when d.region is not null then d.region else null end as distance_label,
             'discovery:'||d.id::text as synthetic_key,
             now() as created_at,
             null::timestamptz as selected_at,
             null::uuid as selected_by_user_id,
             d.id as source_discovery_candidate_id,
             'FRESH_DIRECTION'::text as recommendation_reason_key,
             'fresh'::text as novelty_label,
             true as is_demo
    ) rr
  loop
    insert into public.recommendations(
      id,request_id,heart_stone_id,recommendation_class,title,summary,shared_reason,
      estimated_duration_minutes,estimated_budget,distance_label,synthetic_key,created_at,
      selected_at,selected_by_user_id,source_discovery_candidate_id,recommendation_reason_key,
      novelty_label,is_demo
    ) values (
      v_rec.id,v_rec.request_id,v_rec.heart_stone_id,v_rec.recommendation_class,v_rec.title,v_rec.summary,v_rec.shared_reason,
      v_rec.estimated_duration_minutes,v_rec.estimated_budget,v_rec.distance_label,v_rec.synthetic_key,v_rec.created_at,
      v_rec.selected_at,v_rec.selected_by_user_id,v_rec.source_discovery_candidate_id,v_rec.recommendation_reason_key,
      v_rec.novelty_label,true
    ) returning * into v_rec;
    return next v_rec;
  end loop;
  return;
end;
$function$;

CREATE OR REPLACE FUNCTION public.respond_demo_date_invitation(p_adventure_id uuid, p_accept boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare v_adv public.adventures%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_adv from public.adventures where id=p_adventure_id for update;
 if not found then raise exception 'ADVENTURE_NOT_FOUND'; end if;
 perform public.require_active_heart_stone_member(v_adv.heart_stone_id);
 if not coalesce(v_adv.is_demo,false) then raise exception 'DEMO_ADVENTURE_REQUIRED'; end if;
 if v_adv.status <> 'proposed'::public.adventure_status then raise exception 'INVITATION_NOT_PENDING'; end if;
 if v_adv.created_by_user_id=auth.uid() then raise exception 'INVITER_CANNOT_RESPOND'; end if;
 if p_accept then
   perform heartstone_private.require_demo_profile_requirements(v_adv.heart_stone_id);
   update public.adventures set status='active',started_at=now(),invitation_accepted_at=now(),updated_at=now() where id=p_adventure_id;
   return 'accepted';
 else
   update public.adventures set status='abandoned',updated_at=now() where id=p_adventure_id;
   return 'declined';
 end if;
end;$function$;

CREATE OR REPLACE FUNCTION public.reveal_demo_adventure(p_adventure_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare v_adv public.adventures%rowtype;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 select * into v_adv from public.adventures where id=p_adventure_id for update;
 if not found then raise exception 'ADVENTURE_NOT_FOUND'; end if;
 perform public.require_active_heart_stone_member(v_adv.heart_stone_id);
 if not coalesce(v_adv.is_demo,false) or v_adv.status <> 'active'::public.adventure_status then raise exception 'ACCEPTED_DEMO_ADVENTURE_REQUIRED'; end if;
 perform heartstone_private.require_demo_profile_requirements(v_adv.heart_stone_id);
 update public.adventures set adventure_revealed_at=coalesce(adventure_revealed_at,now()),updated_at=now() where id=p_adventure_id;
 return 'revealed';
end;$function$;

CREATE OR REPLACE FUNCTION public.set_demo_invitation_style(p_adventure_id uuid, p_style text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare v_adv public.adventures%rowtype; v_style text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 v_style:=lower(coalesce(p_style,'surprise'));
 if v_style not in ('romantic','playful','mysterious','adventurous','surprise') then raise exception 'INVALID_INVITATION_STYLE'; end if;
 select * into v_adv from public.adventures where id=p_adventure_id for update;
 if not found then raise exception 'ADVENTURE_NOT_FOUND'; end if;
 perform public.require_active_heart_stone_member(v_adv.heart_stone_id);
 if v_adv.created_by_user_id<>auth.uid() or v_adv.status <> 'proposed'::public.adventure_status then raise exception 'NOT_INVITER_OR_NOT_PENDING'; end if;
 perform heartstone_private.require_demo_profile_requirements(v_adv.heart_stone_id);
 update public.adventures set invitation_style=v_style,updated_at=now() where id=p_adventure_id;
 return v_style;
end;$function$;

-- Keep these demo entrypoints restricted to signed-in clients. Existing owner/membership checks stay in place.
revoke execute on function public.begin_demo_quest(uuid,public.adventure_type,text,integer,text,text[],integer,text,integer) from public,anon;
grant execute on function public.begin_demo_quest(uuid,public.adventure_type,text,integer,text,text[],integer,text,integer) to authenticated;
revoke execute on function public.refresh_demo_recommendations(uuid,uuid[],integer) from public,anon;
grant execute on function public.refresh_demo_recommendations(uuid,uuid[],integer) to authenticated;
revoke execute on function public.propose_demo_recommendation(uuid) from public,anon;
grant execute on function public.propose_demo_recommendation(uuid) to authenticated;
revoke execute on function public.set_demo_invitation_style(uuid,text) from public,anon;
grant execute on function public.set_demo_invitation_style(uuid,text) to authenticated;
revoke execute on function public.respond_demo_date_invitation(uuid,boolean) from public,anon;
grant execute on function public.respond_demo_date_invitation(uuid,boolean) to authenticated;
revoke execute on function public.reveal_demo_adventure(uuid) from public,anon;
grant execute on function public.reveal_demo_adventure(uuid) to authenticated;

commit;

