create table hs_invitation_internal.profile_pictures(
 user_id uuid primary key references auth.users(id) on delete cascade,
 picture text not null check(picture in ('heart','sun','moon','flower','compass','initials') or (length(picture)<=140000 and picture ~ '^data:image/jpeg;base64,[A-Za-z0-9+/]+={0,2}$'))
);
alter table hs_invitation_internal.profile_pictures enable row level security;
create policy deny_direct on hs_invitation_internal.profile_pictures for all to authenticated using(false) with check(false);
revoke all on hs_invitation_internal.profile_pictures from public,anon,authenticated;
create function hs_invitation_internal.my_picture(p_expected_user uuid,p_picture text default null) returns text language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid()<>p_expected_user then raise exception 'Account changed' using errcode='42501'; end if;
 if p_picture is not null then
 insert into hs_invitation_internal.profile_pictures values(auth.uid(),p_picture) on conflict(user_id) do update set picture=excluded.picture;
 end if;
 return coalesce((select picture from hs_invitation_internal.profile_pictures where user_id=auth.uid()),'initials');
end;$$;
revoke all on function hs_invitation_internal.my_picture(uuid,text) from public,anon;
grant execute on function hs_invitation_internal.my_picture(uuid,text) to authenticated;
create function public.my_moment_profile_picture(p_expected_user uuid,p_picture text default null) returns text language sql security invoker set search_path='' as $$select hs_invitation_internal.my_picture(p_expected_user,p_picture);$$;
revoke all on function public.my_moment_profile_picture(uuid,text) from public,anon;
grant execute on function public.my_moment_profile_picture(uuid,text) to authenticated;
create or replace function hs_invitation_internal.invitation_partners(p_heart_stone_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=auth.uid() and status='active') then raise exception 'Connection unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(nullif(btrim(p.first_name),''),'Connected partner'),'picture',coalesce(a.picture,'initials')) order by m.user_id)
 from public.heart_stone_memberships m left join public.profiles p on p.id=m.user_id left join hs_invitation_internal.profile_pictures a on a.user_id=m.user_id
 where m.heart_stone_id=p_heart_stone_id and m.status='active' and m.user_id<>auth.uid()),'[]'::jsonb);
end;$$;