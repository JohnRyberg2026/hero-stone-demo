-- Explicit sharing must not resume automatically after membership reactivation.
-- Installation preserves existing shares. Status changes mark related shares revoked.
alter table hs_availability_internal.hearts add column revoked_at timestamptz;
CREATE OR REPLACE FUNCTION hs_availability_internal.set_heart(p_heart_stone_id uuid, p_partner_id uuid, p_expected_user uuid, p_day date, p_zone text, p_shared boolean)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid(); om uuid; pm uuid; expiry timestamptz; today date;
begin
 if u is null or u is distinct from p_expected_user or p_partner_id is null or u=p_partner_id or p_shared is null then raise exception 'Availability unavailable' using errcode='42501'; end if;
 -- Removal is idempotent and can only remove this caller's date for this partner.
 if not p_shared then
  delete from hs_availability_internal.hearts where heart_stone_id=p_heart_stone_id and owner_id=u and partner_id=p_partner_id and day=p_day;
  return;
 end if;
 perform hs_invitation_internal.require_pair(p_heart_stone_id,u,p_partner_id);
 if p_zone is null or length(p_zone)>80 or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then raise exception 'Choose a valid timezone'; end if;
 today:=(now() at time zone p_zone)::date;
 if p_day is null or p_day<today or p_day>today+366 then raise exception 'Choose today or a day within the next year'; end if;
 expiry:=((p_day+1)::timestamp at time zone p_zone);
 select id into strict om from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=u and status='active';
 select id into strict pm from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=p_partner_id and status='active';
 insert into hs_availability_internal.hearts(heart_stone_id,owner_id,partner_id,owner_membership,partner_membership,day,expires_at) values(p_heart_stone_id,u,p_partner_id,om,pm,p_day,expiry)
 on conflict(heart_stone_id,owner_id,partner_id,day) do update set owner_membership=excluded.owner_membership,partner_membership=excluded.partner_membership,expires_at=excluded.expires_at,revoked_at=null;
end; $function$;
CREATE OR REPLACE FUNCTION hs_availability_internal.list_hearts(p_heart_stone_id uuid, p_expected_user uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare u uuid:=auth.uid();
begin
 if u is null or u is distinct from p_expected_user or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=u and status='active') then raise exception 'Availability unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('owner_id',h.owner_id,'partner_id',h.partner_id,'day',h.day,'expires_at',h.expires_at) order by h.day,h.owner_id)
 from hs_availability_internal.hearts h
 join public.heart_stone_memberships om on om.id=h.owner_membership and om.user_id=h.owner_id and om.heart_stone_id=h.heart_stone_id and om.status='active'
 join public.heart_stone_memberships pm on pm.id=h.partner_membership and pm.user_id=h.partner_id and pm.heart_stone_id=h.heart_stone_id and pm.status='active'
 where h.heart_stone_id=p_heart_stone_id and u in(h.owner_id,h.partner_id) and h.expires_at>now() and h.revoked_at is null),'[]'::jsonb);
end; $function$;
create function hs_availability_internal.revoke_membership_hearts()
returns trigger language plpgsql security definer set search_path='' as $function$
begin
 update hs_availability_internal.hearts set revoked_at=coalesce(revoked_at,now())
 where owner_membership=old.id or partner_membership=old.id;
 return new;
end;
$function$;
revoke all on function hs_availability_internal.revoke_membership_hearts() from public,anon,authenticated;
create trigger revoke_availability_on_membership_change
 after update of status on public.heart_stone_memberships
 for each row when(old.status is distinct from new.status)
 execute function hs_availability_internal.revoke_membership_hearts();
