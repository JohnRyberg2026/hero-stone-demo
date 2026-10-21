alter table hs_invitation_internal.invitations add column started_at timestamptz;
create function hs_invitation_internal.begin_moment(p_invitation_id uuid,p_expected_user uuid,p_expected_revision integer)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; stamp timestamptz;
begin
 if auth.uid() is null or p_expected_user is null or auth.uid()<>p_expected_user then raise exception 'Sign in with the expected account' using errcode='42501'; end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or auth.uid() not in (v.sender_id,v.recipient_id) then raise exception 'Moment unavailable' using errcode='42501';end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if p_expected_revision is null or v.revision<>p_expected_revision or v.status<>'accepted' then raise exception 'This invitation changed. Refresh before beginning';end if;
 if v.started_at is not null then return v.started_at;end if;
 update hs_invitation_internal.invitations set started_at=now() where id=v.id returning started_at into stamp;
 return stamp;
end; $$;
revoke all on function hs_invitation_internal.begin_moment(uuid,uuid,integer) from public,anon;
grant execute on function hs_invitation_internal.begin_moment(uuid,uuid,integer) to authenticated;
create function public.begin_shared_moment(p_invitation_id uuid,p_expected_user uuid,p_expected_revision integer)
returns timestamptz language sql security invoker set search_path='' as $$
 select hs_invitation_internal.begin_moment(p_invitation_id,p_expected_user,p_expected_revision);
$$;
revoke all on function public.begin_shared_moment(uuid,uuid,integer) from public,anon;
grant execute on function public.begin_shared_moment(uuid,uuid,integer) to authenticated;

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
 return coalesce((select jsonb_agg(to_jsonb(q) order by (q.status='accepted' and q.started_at is not null) desc,q.created_at desc) from (
 select i.id,i.heart_stone_id,i.sender_id,i.recipient_id,i.message,i.kind,i.plan,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.title else 'A little surprise for us' end as title,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.story when i.reveal_mode='hint' then i.hint else 'A little surprise is waiting for us.' end as story,
 i.started_at,i.revision,i.reveal_mode,i.status,i.response_note,i.created_at,i.responded_at,i.cancelled_at,i.cancelled_by
 from hs_invitation_internal.invitations i
 where i.heart_stone_id=p_heart_stone_id and v_user in(i.sender_id,i.recipient_id)
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.sender_id and status='active')
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.recipient_id and status='active')
 order by (i.status='accepted' and i.started_at is not null) desc,i.created_at desc,i.id limit 50
 ) q),'[]'::jsonb);
end; $function$
