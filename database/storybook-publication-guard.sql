-- Review/staging candidate only. Requires storybook-consent-ledger.sql.
-- Freeze new publication, including alternate legacy state setters, until the
-- complete baseline/source/approval/write-concurrency integration is validated.
-- Existing books are not changed or unpublished by installing these triggers.
create function hs_storybook_consent.guard_publication() returns trigger language plpgsql security definer set search_path='' as $$
declare r jsonb;
begin
 if tg_op='INSERT' then
  if new.state::text='published' then raise exception 'New publication is disabled pending consent integration' using errcode='0A000';end if;
  return new;
 end if;
 if old.state::text='published' and ((to_jsonb(new)-array['state','updated_at']) is distinct from (to_jsonb(old)-array['state','updated_at']) or new.state::text not in ('published','archived')) then raise exception 'Archive the published book before changing its contents' using errcode='42501';end if;
 if new.state::text='published' and old.state::text<>'published' then
  if (to_jsonb(new)-array['state','updated_at','published_at']) is distinct from (to_jsonb(old)-array['state','updated_at','published_at']) then raise exception 'Review content changes separately before publication' using errcode='40001';end if;
  r:=hs_storybook_consent.action(auth.uid(),old.id,'publish','review',null,null);
  if not coalesce((r->>'allApproved')::boolean,false) then raise exception 'Every required participant must approve this current publication version' using errcode='42501';end if;
  -- Deliberate hard stop. Approval recording does not authorize execution while
  -- source eligibility, all legacy writers and delivery boundaries are unverified.
  raise exception 'Publication execution is disabled pending full staging review' using errcode='0A000';
 end if;
 return new;
end;$$;
revoke all on function hs_storybook_consent.guard_publication() from public,anon,authenticated;
create trigger storybook_guard_publication before insert or update on public.storybook_volumes for each row execute function hs_storybook_consent.guard_publication();

create function hs_storybook_consent.guard_published_entry() returns trigger language plpgsql security definer set search_path='' as $$
declare n jsonb:=to_jsonb(new);o jsonb:=to_jsonb(old);
begin
 if exists(select 1 from public.storybook_volumes v where v.state::text='published' and (v.id in ((n->>'volume_id')::uuid,(o->>'volume_id')::uuid) or (tg_table_name='story_seeds' and exists(select 1 from public.storybook_entries e where e.volume_id=v.id and e.story_seed_id in ((n->>'id')::uuid,(o->>'id')::uuid))))) then raise exception 'Archive the published book before changing its entries' using errcode='42501';end if;
 if tg_op='DELETE' then return old;end if;return new;
end;$$;
revoke all on function hs_storybook_consent.guard_published_entry() from public,anon,authenticated;
create trigger storybook_guard_published_entry before insert or update or delete on public.storybook_entries for each row execute function hs_storybook_consent.guard_published_entry();
create trigger storybook_guard_published_source before update or delete on public.story_seeds for each row execute function hs_storybook_consent.guard_published_entry();
