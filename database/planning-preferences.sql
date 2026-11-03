-- Reuse the existing owner-only onboarding table; no inferred/user_preferences import.
create function public.my_planning_preferences(p_expected_user uuid,p_action text default 'load',p_expected_revision integer default null,p_profile jsonb default '{}'::jsonb,p_use_with_ai boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare u uuid:=auth.uid(); saved jsonb; rev integer; k text; v jsonb; profile jsonb:='{}'::jsonb;
begin
 if u is null or u is distinct from p_expected_user then raise exception 'Your account changed' using errcode='42501';end if;
 if p_action not in ('load','save','delete') or p_action is null then raise exception 'Invalid preference action';end if;
 if p_action='load' then
  select answer_json into saved from public.user_onboarding_answers where user_id=u and question_key='heartstone_planning_preferences_v1';
  return coalesce(saved,'{"revision":0,"profile":{},"useWithAI":false}'::jsonb);
 end if;
 if p_action='save' then
  if jsonb_typeof(p_profile) is distinct from 'object' or octet_length(p_profile::text)>4000 or p_use_with_ai is null then raise exception 'Invalid preferences';end if;
  for k,v in select * from jsonb_each(p_profile) loop
   if k not in ('budget','activities','avoid') or jsonb_typeof(v)<>'string' or length(v#>>'{}')>240 then raise exception 'Use up to 240 characters per preference';end if;
   if btrim(v#>>'{}')<>'' then profile:=profile||jsonb_build_object(k,btrim(v#>>'{}'));end if;
  end loop;
 end if;
 -- Keep a content-free revision tombstone on delete, so stale tabs cannot restore it.
 insert into public.user_onboarding_answers(user_id,question_key,answer_kind,answer_json)
 values(u,'heartstone_planning_preferences_v1','free_text','{"revision":0,"profile":{},"useWithAI":false}') on conflict(user_id,question_key) do nothing;
 select answer_json into saved from public.user_onboarding_answers where user_id=u and question_key='heartstone_planning_preferences_v1' for update;
 rev:=(saved->>'revision')::integer;
 if p_expected_revision is null or rev is distinct from p_expected_revision then raise exception 'Preferences changed. Reopen them before saving.' using errcode='40001';end if;
 saved:=jsonb_build_object('revision',rev+1,'profile',profile,'useWithAI',case when p_action='delete' then false else p_use_with_ai end);
 update public.user_onboarding_answers set answer_json=saved,updated_at=now() where user_id=u and question_key='heartstone_planning_preferences_v1';
 return saved;
end; $$;
revoke all on function public.my_planning_preferences(uuid,text,integer,jsonb,boolean) from public,anon;
grant execute on function public.my_planning_preferences(uuid,text,integer,jsonb,boolean) to authenticated;
