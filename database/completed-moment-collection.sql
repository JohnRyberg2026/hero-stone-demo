CREATE FUNCTION hs_invitation_internal.list_completed_invitations(p_heart_stone_id uuid, p_invitation_id uuid default null)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=v_user and status='active') then
  raise exception 'Invitation unavailable' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(to_jsonb(q) order by q.completed_at desc,q.id desc) from (
 select i.id,i.heart_stone_id,i.sender_id,i.recipient_id,i.message,i.kind,i.plan,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.title else 'A little surprise for us' end as title,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.story when i.reveal_mode='hint' then i.hint else 'A little surprise is waiting for us.' end as story,
 i.completed_at,i.started_at,i.revision,i.reveal_mode,i.status,i.response_note,i.created_at,i.responded_at,i.cancelled_at,i.cancelled_by,i.cancellation_note,
 case when i.status='accepted' and i.started_at is null and i.completed_at is null and i.schedule_proposal->>'status'='pending' then jsonb_build_object('status','pending','proposed_by',i.schedule_proposal->>'proposed_by') else null end as time_change
 from hs_invitation_internal.invitations i
 where i.heart_stone_id=p_heart_stone_id and v_user in(i.sender_id,i.recipient_id)
 and i.status='accepted' and i.completed_at is not null and (p_invitation_id is null or i.id=p_invitation_id)
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.sender_id and status='active')
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.recipient_id and status='active')
 order by i.completed_at desc,i.id desc limit 50
 ) q),'[]'::jsonb);
end; $function$
;
revoke all on function hs_invitation_internal.list_completed_invitations(uuid,uuid) from public,anon;
grant execute on function hs_invitation_internal.list_completed_invitations(uuid,uuid) to authenticated,service_role;
create function public.list_completed_moment_invitations(p_heart_stone_id uuid,p_invitation_id uuid default null)
returns jsonb language sql security invoker set search_path='' as $wrapper$
 select hs_invitation_internal.list_completed_invitations(p_heart_stone_id,p_invitation_id);
$wrapper$;
revoke all on function public.list_completed_moment_invitations(uuid,uuid) from public,anon;
grant execute on function public.list_completed_moment_invitations(uuid,uuid) to authenticated,service_role;
