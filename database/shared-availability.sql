-- Date-only, explicitly shared availability. No calendar titles, notes or invitations.
create schema if not exists hs_availability_internal;
revoke all on schema hs_availability_internal from public,anon,authenticated;
grant usage on schema hs_availability_internal to authenticated;
create table hs_availability_internal.hearts (
 heart_stone_id uuid not null references public.heart_stones(id),
 owner_id uuid not null references auth.users(id),
 partner_id uuid not null references auth.users(id),
 owner_membership uuid not null references public.heart_stone_memberships(id),
 partner_membership uuid not null references public.heart_stone_memberships(id),
 day date not null,
 expires_at timestamptz not null,
 primary key(heart_stone_id,owner_id,partner_id,day),
 check(owner_id<>partner_id)
);
alter table hs_availability_internal.hearts enable row level security;
revoke all on hs_availability_internal.hearts from public,anon,authenticated;
create index availability_partner on hs_availability_internal.hearts(partner_id,heart_stone_id);
create index availability_owner_membership on hs_availability_internal.hearts(owner_membership);
create index availability_partner_membership on hs_availability_internal.hearts(partner_membership);
create function hs_availability_internal.set_heart(p_heart_stone_id uuid,p_partner_id uuid,p_expected_user uuid,p_day date,p_zone text,p_shared boolean)
returns void language plpgsql security definer set search_path='' as $$
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
 insert into hs_availability_internal.hearts values(p_heart_stone_id,u,p_partner_id,om,pm,p_day,expiry)
 on conflict(heart_stone_id,owner_id,partner_id,day) do update set owner_membership=excluded.owner_membership,partner_membership=excluded.partner_membership,expires_at=excluded.expires_at;
end; $$;
create function hs_availability_internal.list_hearts(p_heart_stone_id uuid,p_expected_user uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid();
begin
 if u is null or u is distinct from p_expected_user or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=u and status='active') then raise exception 'Availability unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('owner_id',h.owner_id,'partner_id',h.partner_id,'day',h.day,'expires_at',h.expires_at) order by h.day,h.owner_id)
 from hs_availability_internal.hearts h
 join public.heart_stone_memberships om on om.id=h.owner_membership and om.user_id=h.owner_id and om.heart_stone_id=h.heart_stone_id and om.status='active'
 join public.heart_stone_memberships pm on pm.id=h.partner_membership and pm.user_id=h.partner_id and pm.heart_stone_id=h.heart_stone_id and pm.status='active'
 where h.heart_stone_id=p_heart_stone_id and u in(h.owner_id,h.partner_id) and h.expires_at>now()),'[]'::jsonb);
end; $$;
revoke all on all functions in schema hs_availability_internal from public,anon,authenticated;
grant execute on function hs_availability_internal.set_heart(uuid,uuid,uuid,date,text,boolean),hs_availability_internal.list_hearts(uuid,uuid) to authenticated;
create function public.set_shared_availability(p_heart_stone_id uuid,p_partner_id uuid,p_expected_user uuid,p_day date,p_zone text,p_shared boolean)
returns void language sql security invoker set search_path='' as $$select hs_availability_internal.set_heart(p_heart_stone_id,p_partner_id,p_expected_user,p_day,p_zone,p_shared);$$;
create function public.list_shared_availability(p_heart_stone_id uuid,p_expected_user uuid)
returns jsonb language sql security invoker set search_path='' as $$select hs_availability_internal.list_hearts(p_heart_stone_id,p_expected_user);$$;
revoke all on function public.set_shared_availability(uuid,uuid,uuid,date,text,boolean),public.list_shared_availability(uuid,uuid) from public,anon;
grant execute on function public.set_shared_availability(uuid,uuid,uuid,date,text,boolean),public.list_shared_availability(uuid,uuid) to authenticated;
