alter table hs_invitation_internal.invitations add column completed_at timestamptz;
create table hs_invitation_internal.moment_memories(
 invitation_id uuid not null references hs_invitation_internal.invitations(id),
 user_id uuid not null references auth.users(id) on delete cascade,
 note text not null check(char_length(note)<=4000),
 updated_at timestamptz not null default now(),
 primary key(invitation_id,user_id)
);
alter table hs_invitation_internal.moment_memories enable row level security;
revoke all on hs_invitation_internal.moment_memories from public,anon,authenticated;
create function hs_invitation_internal.finish_moment(p_invitation_id uuid,p_expected_user uuid,p_expected_revision integer)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; stamp timestamptz;
begin
 if auth.uid() is null or p_expected_user is null or auth.uid()<>p_expected_user then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or auth.uid() not in(v.sender_id,v.recipient_id) then raise exception 'Moment unavailable' using errcode='42501';end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if p_expected_revision is null or v.revision<>p_expected_revision or v.status<>'accepted' or v.started_at is null then raise exception 'Refresh this moment before closing it';end if;
 if v.completed_at is not null then return v.completed_at;end if;
 update hs_invitation_internal.invitations set completed_at=now() where id=v.id returning completed_at into stamp;
 return stamp;
end;$$;
create function public.finish_shared_moment(p_invitation_id uuid,p_expected_user uuid,p_expected_revision integer)
returns timestamptz language sql security invoker set search_path='' as $$select hs_invitation_internal.finish_moment(p_invitation_id,p_expected_user,p_expected_revision);$$;
create function hs_invitation_internal.my_memory(p_invitation_id uuid,p_expected_user uuid,p_note text default null)
returns text language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; saved text;
begin
 if auth.uid() is null or p_expected_user is null or auth.uid()<>p_expected_user then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for share;
 if not found or auth.uid() not in(v.sender_id,v.recipient_id) or v.completed_at is null then raise exception 'Memory unavailable' using errcode='42501';end if;
 if p_note is not null then
  if char_length(p_note)>4000 then raise exception 'Keep your memory within 4000 characters';end if;
  insert into hs_invitation_internal.moment_memories(invitation_id,user_id,note) values(v.id,auth.uid(),p_note)
  on conflict(invitation_id,user_id) do update set note=excluded.note,updated_at=now();
 end if;
 select note into saved from hs_invitation_internal.moment_memories where invitation_id=v.id and user_id=auth.uid();
 return coalesce(saved,'');
end;$$;
create function public.my_shared_moment_memory(p_invitation_id uuid,p_expected_user uuid,p_note text default null)
returns text language sql security invoker set search_path='' as $$select hs_invitation_internal.my_memory(p_invitation_id,p_expected_user,p_note);$$;
revoke all on function hs_invitation_internal.finish_moment(uuid,uuid,integer) from public,anon;
grant execute on function hs_invitation_internal.finish_moment(uuid,uuid,integer) to authenticated;
revoke all on function public.finish_shared_moment(uuid,uuid,integer) from public,anon;
grant execute on function public.finish_shared_moment(uuid,uuid,integer) to authenticated;
revoke all on function hs_invitation_internal.my_memory(uuid,uuid,text) from public,anon;
grant execute on function hs_invitation_internal.my_memory(uuid,uuid,text) to authenticated;
revoke all on function public.my_shared_moment_memory(uuid,uuid,text) from public,anon;
grant execute on function public.my_shared_moment_memory(uuid,uuid,text) to authenticated;
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
 i.completed_at,i.started_at,i.revision,i.reveal_mode,i.status,i.response_note,i.created_at,i.responded_at,i.cancelled_at,i.cancelled_by
 from hs_invitation_internal.invitations i
 where i.heart_stone_id=p_heart_stone_id and v_user in(i.sender_id,i.recipient_id)
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.sender_id and status='active')
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.recipient_id and status='active')
 order by (i.status='accepted' and i.started_at is not null and i.completed_at is null) desc,i.created_at desc,i.id limit 50
 ) q),'[]'::jsonb);
end; $function$;
create or replace function hs_invitation_internal.begin_moment(p_invitation_id uuid,p_expected_user uuid,p_expected_revision integer)
returns timestamptz language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; stamp timestamptz;
begin
 if auth.uid() is null or p_expected_user is null or auth.uid()<>p_expected_user then raise exception 'Sign in with the expected account' using errcode='42501'; end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or auth.uid() not in (v.sender_id,v.recipient_id) then raise exception 'Moment unavailable' using errcode='42501';end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if p_expected_revision is null or v.revision<>p_expected_revision or v.status<>'accepted' or v.completed_at is not null then raise exception 'This invitation changed. Refresh before beginning';end if;
 if v.started_at is not null then return v.started_at;end if;
 update hs_invitation_internal.invitations set started_at=now() where id=v.id returning started_at into stamp;
 return stamp;
end; $$;
create or replace function hs_invitation_internal.cancel_invitation(p_invitation_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501';end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or auth.uid() not in(v.sender_id,v.recipient_id) then raise exception 'Invitation unavailable' using errcode='42501';end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if v.completed_at is not null then raise exception 'This moment has already closed';end if;
 if v.status='cancelled' then return v.status;end if;
 if v.status not in('pending','accepted','reschedule') then raise exception 'This invitation is already closed';end if;
 update hs_invitation_internal.invitations set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid() where id=v.id;
 return 'cancelled';
end;$$;
create policy deny_direct_memory_access on hs_invitation_internal.moment_memories for all to authenticated using (false) with check (false);
