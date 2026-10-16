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
 update public.adventures set invitation_style=v_style,updated_at=now() where id=p_adventure_id;
 return v_style;
end;$function$;

