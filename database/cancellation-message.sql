alter table hs_invitation_internal.invitations add column cancellation_note text not null default '' check(char_length(cancellation_note)<=400);
create function hs_invitation_internal.cancel_revision(p_invitation_id uuid,p_expected_user uuid,p_expected_revision integer,p_note text default '')
returns text language plpgsql security definer set search_path='' as $cancel$
declare v hs_invitation_internal.invitations%rowtype;n text:=trim(coalesce(p_note,''));
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'Your signed-in account is required' using errcode='42501';end if;
 if char_length(n)>400 then raise exception 'Use at most 400 characters' using errcode='22023';end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or auth.uid() not in(v.sender_id,v.recipient_id) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if p_expected_revision is distinct from v.revision then raise exception 'The invitation changed. Refresh before cancelling' using errcode='40001';end if;
 if v.status='cancelled' then
  if v.cancelled_by=auth.uid() and v.cancellation_note=n then return 'cancelled';end if;
  raise exception 'This invitation is already cancelled. Refresh to see the saved message' using errcode='40001';
 end if;
 perform hs_invitation_internal.cancel_invitation(p_invitation_id);
 update hs_invitation_internal.invitations set cancellation_note=n where id=v.id;
 return 'cancelled';
end;$cancel$;
revoke all on function hs_invitation_internal.cancel_revision(uuid,uuid,integer,text) from public,anon;
grant execute on function hs_invitation_internal.cancel_revision(uuid,uuid,integer,text) to authenticated,service_role;
create function public.cancel_moment_invitation_revision(p_invitation_id uuid,p_expected_user uuid,p_expected_revision integer,p_note text default '')
returns text language sql security invoker set search_path='' as $wrapper$
 select hs_invitation_internal.cancel_revision(p_invitation_id,p_expected_user,p_expected_revision,p_note);
$wrapper$;
revoke all on function public.cancel_moment_invitation_revision(uuid,uuid,integer,text) from public,anon;
grant execute on function public.cancel_moment_invitation_revision(uuid,uuid,integer,text) to authenticated,service_role;
CREATE OR REPLACE FUNCTION hs_invitation_internal.list_invitations(p_heart_stone_id uuid)
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
 return coalesce((select jsonb_agg(to_jsonb(q) order by (q.status='accepted' and q.started_at is not null and q.completed_at is null) desc,q.created_at desc) from (
 select i.id,i.heart_stone_id,i.sender_id,i.recipient_id,i.message,i.kind,i.plan,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.title else 'A little surprise for us' end as title,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.story when i.reveal_mode='hint' then i.hint else 'A little surprise is waiting for us.' end as story,
 i.completed_at,i.started_at,i.revision,i.reveal_mode,i.status,i.response_note,i.created_at,i.responded_at,i.cancelled_at,i.cancelled_by,i.cancellation_note
 from hs_invitation_internal.invitations i
 where i.heart_stone_id=p_heart_stone_id and v_user in(i.sender_id,i.recipient_id)
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.sender_id and status='active')
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.recipient_id and status='active')
 order by (i.status='accepted' and i.started_at is not null and i.completed_at is null) desc,i.created_at desc,i.id limit 50
 ) q),'[]'::jsonb);
end; $function$
;
