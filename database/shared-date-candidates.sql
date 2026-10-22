-- Additive candidate lookup; requires shared-date-server.sql. No age flags,
-- other relationships, private answers, contact details or memories are returned.
create function hs_shared_dates.candidates(p_expected_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or p_expected_user is distinct from v_user then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 perform hs_shared_dates.require_adults(array[v_user]);
 return jsonb_build_object('self',jsonb_build_object('id',v_user,'name',(select first_name from public.profiles where id=v_user)),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'name',q.name) order by q.name,q.id) from (
  select distinct p.id,p.first_name as name from public.heart_stone_memberships me
  join public.heart_stone_memberships partner on partner.heart_stone_id=me.heart_stone_id
  join public.profiles p on p.id=partner.user_id
  where me.user_id=v_user and me.status='active' and partner.status='active' and p.id<>v_user and p.account_status='active'
  order by p.first_name,p.id limit 100
 ) q),'[]'::jsonb));
end;$$;
revoke all on function hs_shared_dates.candidates(uuid) from public,anon;
grant execute on function hs_shared_dates.candidates(uuid) to authenticated;
create function public.shared_date_candidates(p_expected_user uuid)
returns jsonb language sql security invoker set search_path='' as $$select hs_shared_dates.candidates(p_expected_user);$$;
revoke all on function public.shared_date_candidates(uuid) from public,anon;
grant execute on function public.shared_date_candidates(uuid) to authenticated;

-- Default response privacy: only the caller sees their individual response.
create or replace function hs_shared_dates.snapshot(p_date uuid,p_actor uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare d hs_shared_dates.dates%rowtype;
begin
 select * into d from hs_shared_dates.dates where id=p_date;
 if not found or not exists(select 1 from hs_shared_dates.participants where date_id=d.id and revision=d.revision and user_id=p_actor)
 or (d.state='draft' and d.organizer<>p_actor) then raise exception 'Shared date unavailable' using errcode='42501';end if;
 -- A revoked/expired user may still withdraw or stop; do not disclose the plan.
 if (p_actor<>d.organizer and not exists(select 1 from public.heart_stone_memberships a join public.heart_stone_memberships b on b.heart_stone_id=a.heart_stone_id where a.user_id=d.organizer and b.user_id=p_actor and a.status='active' and b.status='active')) or not exists(select 1 from hs_shared_dates.verified_adults v join public.profiles f on f.id=v.user_id where v.user_id=p_actor and f.account_status='active' and v.revoked_at is null and v.verified_at<=now() and v.expires_at>now()) then
  return jsonb_build_object('id',d.id,'revision',d.revision,'state',d.state,'eligibility_required',true);
 end if;
 return jsonb_build_object('id',d.id,'organizer',d.organizer,'revision',d.revision,'title',d.title,'when',d.when_text,'meeting',d.meeting,'state',d.state,
 'participants',(select jsonb_agg(jsonb_build_object('id',p.user_id,'name',coalesce(nullif(btrim(f.first_name),''),'Participant'),'response',case when p.user_id=p_actor then p.response else null end) order by p.user_id)
 from hs_shared_dates.participants p left join public.profiles f on f.id=p.user_id where p.date_id=d.id and p.revision=d.revision));
end;$$;

