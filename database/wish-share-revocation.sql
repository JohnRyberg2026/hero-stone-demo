-- A connection transition ends snapshot sharing; reactivation does not restore it.
-- Existing active snapshots are preserved at installation.
alter table public.quest_wish_shares add column revoked_at timestamptz;
alter policy quest_wish_shares_read on public.quest_wish_shares using (
 owner_id=(select auth.uid()) or (
 revoked_at is null and recipient_id=(select auth.uid())
 and public.is_active_heart_stone_member(heart_stone_id)
 and exists(select 1 from public.heart_stone_memberships m where m.heart_stone_id=quest_wish_shares.heart_stone_id and m.user_id=quest_wish_shares.owner_id and m.status='active')
 and exists(select 1 from public.heart_stones h where h.id=quest_wish_shares.heart_stone_id and h.status='connected')
 ));
create schema if not exists hs_wishes_internal;
revoke all on schema hs_wishes_internal from public,anon,authenticated;
create function hs_wishes_internal.revoke_membership_snapshots()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
 update public.quest_wish_shares set revoked_at=coalesce(revoked_at,now())
 where heart_stone_id=old.heart_stone_id and (owner_id=old.user_id or recipient_id=old.user_id);
 return new;
end;
$function$;
create function hs_wishes_internal.revoke_connection_snapshots()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
 update public.quest_wish_shares set revoked_at=coalesce(revoked_at,now())
 where heart_stone_id=old.id;
 return new;
end;
$function$;
revoke all on all functions in schema hs_wishes_internal from public,anon,authenticated;
create trigger revoke_wishes_on_membership_change
 after update of status on public.heart_stone_memberships
 for each row when(old.status is distinct from new.status)
 execute function hs_wishes_internal.revoke_membership_snapshots();
create trigger revoke_wishes_on_connection_change
 after update of status on public.heart_stones
 for each row when(old.status is distinct from new.status)
 execute function hs_wishes_internal.revoke_connection_snapshots();

-- RLS does not govern TRUNCATE or trigger-management privileges.
-- Keep only operations used by the wish editor and snapshot UI.
revoke all privileges on public.quest_wishes,public.quest_wish_shares from public,anon,authenticated;
grant select,insert,update,delete on public.quest_wishes to authenticated;
grant select,insert,delete on public.quest_wish_shares to authenticated;
