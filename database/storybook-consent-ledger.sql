-- Review candidate only. Requires the existing relationship Story Book baseline.
-- Records review responses only. Does NOT enable content reads, publication or
-- export, and does NOT replace/enforce the legacy finalization functions yet.
create schema hs_storybook_consent;
revoke all on schema hs_storybook_consent from public,anon,authenticated;
grant usage on schema hs_storybook_consent to authenticated;
create table hs_storybook_consent.responses(
 id bigint generated always as identity primary key,
 volume_id uuid not null references public.storybook_volumes(id),
 fingerprint text not null,
 actor uuid not null references public.profiles(id),
 decision text not null check(decision in ('approved','declined','withdrawn')),
 recorded_at timestamptz not null default clock_timestamp()
);
alter table hs_storybook_consent.responses enable row level security;
revoke all on hs_storybook_consent.responses from public,anon,authenticated;
create index storybook_consent_lookup on hs_storybook_consent.responses(volume_id,fingerprint,actor,id desc);
-- A generation prevents an edit-away/edit-back or leave/rejoin cycle from
-- resurrecting historic approvals even when the final text/roster looks identical.
create table hs_storybook_consent.generations(volume_id uuid primary key references public.storybook_volumes(id),generation bigint not null default 1);
alter table hs_storybook_consent.generations enable row level security;
revoke all on hs_storybook_consent.generations from public,anon,authenticated;
create function hs_storybook_consent.invalidate() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb:=to_jsonb(new);o jsonb:=to_jsonb(old);
begin
 if tg_table_name='storybook_volumes' then update hs_storybook_consent.generations set generation=generation+1 where volume_id in ((n->>'id')::uuid,(o->>'id')::uuid);
 elsif tg_table_name='storybook_entries' then update hs_storybook_consent.generations set generation=generation+1 where volume_id in ((n->>'volume_id')::uuid,(o->>'volume_id')::uuid);
 elsif tg_table_name='story_seeds' then update hs_storybook_consent.generations set generation=generation+1 where volume_id in(select volume_id from public.storybook_entries where story_seed_id in ((n->>'id')::uuid,(o->>'id')::uuid));
 elsif tg_table_name='heart_stone_memberships' then update hs_storybook_consent.generations set generation=generation+1 where volume_id in(select id from public.storybook_volumes where heart_stone_id in ((n->>'heart_stone_id')::uuid,(o->>'heart_stone_id')::uuid));
 elsif tg_table_name='profiles' then update hs_storybook_consent.generations set generation=generation+1 where volume_id in(select v.id from public.storybook_volumes v join public.heart_stone_memberships m on m.heart_stone_id=v.heart_stone_id where m.user_id in ((n->>'id')::uuid,(o->>'id')::uuid));
 end if;return null;
end;$$;
revoke all on function hs_storybook_consent.invalidate() from public,anon,authenticated;
create trigger storybook_consent_invalidate_volume after update on public.storybook_volumes for each row execute function hs_storybook_consent.invalidate();
create trigger storybook_consent_invalidate_entry after insert or update or delete on public.storybook_entries for each row execute function hs_storybook_consent.invalidate();
create trigger storybook_consent_invalidate_source after update or delete on public.story_seeds for each row execute function hs_storybook_consent.invalidate();
create trigger storybook_consent_invalidate_members after insert or update or delete on public.heart_stone_memberships for each row execute function hs_storybook_consent.invalidate();
create trigger storybook_consent_invalidate_profile after update on public.profiles for each row execute function hs_storybook_consent.invalidate();
create function hs_storybook_consent.action(p_expected_user uuid,p_volume_id uuid,p_action text,p_operation text,p_reviewed_fingerprint text,p_decision text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_actor uuid:=auth.uid();v_hs uuid;v_volume jsonb;v_people uuid[];v_entries jsonb;v_sources jsonb;v_contract jsonb;v_hash text;v_own text;v_ready boolean;v_generation bigint;
begin
 if v_actor is null or p_expected_user is distinct from v_actor then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 if p_action not in ('include','publish','export') or p_action is null or p_operation not in ('review','respond') or p_operation is null then raise exception 'Explicit action and operation required' using errcode='22023';end if;
 select heart_stone_id into v_hs from public.storybook_volumes where id=p_volume_id;
 if not found then raise exception 'Book unavailable' using errcode='42501';end if;
 -- The relationship and book serialize this candidate's own responses. Full
 -- integration must verify every legacy writer obeys compatible locking.
 perform 1 from public.heart_stones where id=v_hs for update;
 perform 1 from public.heart_stone_memberships where heart_stone_id=v_hs order by user_id for share;
 select array_agg(distinct user_id order by user_id) into v_people from public.heart_stone_memberships where heart_stone_id=v_hs and status='active';
 if v_people is null or not v_actor=any(v_people) then raise exception 'Book unavailable' using errcode='42501';end if;
 perform 1 from public.profiles where id=any(v_people) order by id for share;
 if exists(select 1 from unnest(v_people) u where not exists(select 1 from public.profiles p where p.id=u and p.account_status='active')) then raise exception 'Participant eligibility unavailable' using errcode='42501';end if;
 select to_jsonb(v) into v_volume from public.storybook_volumes v where id=p_volume_id and heart_stone_id=v_hs for update;
 if not found then raise exception 'Book changed' using errcode='40001';end if;
 perform 1 from public.storybook_entries where volume_id=p_volume_id order by id for share;
 perform 1 from public.story_seeds s where s.id in(select e.story_seed_id from public.storybook_entries e where e.volume_id=p_volume_id) order by s.id for share;
 if exists(select 1 from public.storybook_entries e left join public.story_seeds s on s.id=e.story_seed_id where e.volume_id=p_volume_id and (s.id is null or s.heart_stone_id is distinct from v_hs)) then raise exception 'Source scope cannot be verified' using errcode='42501';end if;
 select coalesce(jsonb_agg(to_jsonb(e) order by e.id),'[]'::jsonb) into v_entries from public.storybook_entries e where e.volume_id=p_volume_id;
 select coalesce(jsonb_agg(to_jsonb(s) order by s.id),'[]'::jsonb) into v_sources from public.story_seeds s where s.id in(select e.story_seed_id from public.storybook_entries e where e.volume_id=p_volume_id);
 -- Entire observed entry/seed rows bind titles, captions, narrative flags,
 -- source dates/identity and later-added columns. No caller-supplied content hash.
 insert into hs_storybook_consent.generations(volume_id) values(p_volume_id) on conflict do nothing;
 select generation into v_generation from hs_storybook_consent.generations where volume_id=p_volume_id for update;
 v_contract:=jsonb_build_object('version',1,'generation',v_generation,'volume',v_volume,'entries',v_entries,'sources',v_sources,'participants',v_people,'viewers',v_people,'action',p_action,'destination','relationship:'||v_hs::text);
 v_hash:=encode(sha256(convert_to(v_contract::text,'UTF8')),'hex');
 select decision into v_own from hs_storybook_consent.responses where volume_id=p_volume_id and fingerprint=v_hash and actor=v_actor order by id desc limit 1;
 if p_operation='respond' then
  if p_reviewed_fingerprint is distinct from v_hash then raise exception 'Review the current content, audience and action' using errcode='40001';end if;
  if p_decision not in ('approved','declined','withdrawn') or p_decision is null then raise exception 'Explicit response required' using errcode='22023';end if;
  if p_decision='withdrawn' and v_own is distinct from 'approved' then raise exception 'Only a current approval can be withdrawn' using errcode='22023';end if;
  if v_own is distinct from p_decision then insert into hs_storybook_consent.responses(volume_id,fingerprint,actor,decision) values(p_volume_id,v_hash,v_actor,p_decision);end if;
  v_own:=p_decision;
 end if;
 select not exists(select 1 from unnest(v_people) u where (select r.decision from hs_storybook_consent.responses r where r.volume_id=p_volume_id and r.fingerprint=v_hash and r.actor=u order by r.id desc limit 1) is distinct from 'approved') into v_ready;
 return jsonb_build_object('volumeId',p_volume_id,'fingerprint',v_hash,'action',p_action,'destination','relationship:'||v_hs::text,'participants',v_people,'viewers',v_people,'ownResponse',v_own,'allApproved',v_ready,'executionEnabled',false);
end;$$;
revoke all on function hs_storybook_consent.action(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function hs_storybook_consent.action(uuid,uuid,text,text,text,text) to authenticated;
create function public.review_relationship_storybook_consent(p_expected_user uuid,p_volume_id uuid,p_action text,p_operation text default 'review',p_reviewed_fingerprint text default null,p_decision text default null)
returns jsonb language sql security invoker set search_path='' as $$select hs_storybook_consent.action(p_expected_user,p_volume_id,p_action,p_operation,p_reviewed_fingerprint,p_decision);$$;
revoke all on function public.review_relationship_storybook_consent(uuid,uuid,text,text,text,text) from public,anon;
grant execute on function public.review_relationship_storybook_consent(uuid,uuid,text,text,text,text) to authenticated;
