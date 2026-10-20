
create function hs_invitation_internal.invitation_partners(p_heart_stone_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=auth.uid() and status='active') then
 raise exception 'Connection unavailable' using errcode='42501'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',m.user_id,'name',coalesce(nullif(btrim(p.first_name),''),'Connected partner')) order by m.user_id)
 from public.heart_stone_memberships m left join public.profiles p on p.id=m.user_id
 where m.heart_stone_id=p_heart_stone_id and m.status='active' and m.user_id<>auth.uid()),'[]'::jsonb);
end; $$;
create function public.get_moment_invitation_partners(p_heart_stone_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select hs_invitation_internal.invitation_partners(p_heart_stone_id);$$;
create function public.send_checked_moment_invitation(p_expected_sender_id uuid,p_heart_stone_id uuid,p_recipient_id uuid,p_client_request_id uuid,p_message text,p_kind text,p_plan jsonb,p_title text,p_story text,p_reveal_mode text,p_hint text default '')
returns uuid language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() is distinct from p_expected_sender_id then raise exception 'Your account changed. Please review the recipient again.' using errcode='42501'; end if;
 return hs_invitation_internal.send_invitation(p_heart_stone_id,p_recipient_id,p_client_request_id,p_message,p_kind,p_plan,p_title,p_story,p_reveal_mode,p_hint);
end; $$;
revoke all on function hs_invitation_internal.invitation_partners(uuid),public.get_moment_invitation_partners(uuid),public.send_checked_moment_invitation(uuid,uuid,uuid,uuid,text,text,jsonb,text,text,text,text) from public,anon,authenticated;
grant execute on function hs_invitation_internal.invitation_partners(uuid),public.get_moment_invitation_partners(uuid),public.send_checked_moment_invitation(uuid,uuid,uuid,uuid,text,text,jsonb,text,text,text,text) to authenticated;
notify pgrst,'reload schema';
