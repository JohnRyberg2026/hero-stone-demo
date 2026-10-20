
-- Invitation records are operational data, separate from demo adventures and memories.
create schema if not exists hs_invitation_internal;
revoke all on schema hs_invitation_internal from public, anon, authenticated;
grant usage on schema hs_invitation_internal to authenticated;

create table hs_invitation_internal.invitations (
 id uuid primary key default gen_random_uuid(),
 heart_stone_id uuid not null references public.heart_stones(id),
 sender_id uuid not null references auth.users(id),
 recipient_id uuid not null references auth.users(id),
 client_request_id uuid not null,
 message text not null check(char_length(message) between 1 and 1500),
 kind text not null check(kind in ('everyday','date','adventure','quest','own')),
 plan jsonb not null check(jsonb_typeof(plan)='object' and octet_length(plan::text)<=12000),
 title text not null check(char_length(title) between 1 and 120),
 story text not null check(char_length(story) between 1 and 2000),
 reveal_mode text not null check(reveal_mode in ('all','hint','surprise')),
 hint text not null default '' check(char_length(hint)<=400),
 status text not null default 'pending' check(status in ('pending','accepted','declined','reschedule','cancelled')),
 response_note text not null default '' check(char_length(response_note)<=400),
 created_at timestamptz not null default now(),
 responded_at timestamptz,
 cancelled_at timestamptz,
 cancelled_by uuid references auth.users(id),
 unique(sender_id,client_request_id),
 check(sender_id<>recipient_id),
 check(reveal_mode<>'hint' or char_length(btrim(hint))>0)
);
alter table hs_invitation_internal.invitations enable row level security;
revoke all on hs_invitation_internal.invitations from public, anon, authenticated;
create index invitation_sender_recent on hs_invitation_internal.invitations(sender_id,created_at desc);
create index invitation_recipient_recent on hs_invitation_internal.invitations(recipient_id,created_at desc);
create index invitation_heart_stone on hs_invitation_internal.invitations(heart_stone_id);
create index invitation_cancelled_by on hs_invitation_internal.invitations(cancelled_by);

-- Privileged writes are restricted to this unexposed schema. No direct client table writes.
create function hs_invitation_internal.require_pair(p_heart_stone_id uuid,p_sender uuid,p_recipient uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or auth.uid() not in (p_sender,p_recipient) then
  raise exception 'Invitation unavailable' using errcode='42501';
 end if;
 perform 1 from public.heart_stone_memberships
 where heart_stone_id=p_heart_stone_id and user_id in (p_sender,p_recipient) and status='active'
 order by user_id for share;
 if not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=p_sender and status='active')
 or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=p_recipient and status='active') then
  raise exception 'Both people need an active HEART STONE connection' using errcode='42501';
 end if;
end; $$;
revoke all on function hs_invitation_internal.require_pair(uuid,uuid,uuid) from public,anon,authenticated;

create function hs_invitation_internal.send_invitation(
 p_heart_stone_id uuid,p_recipient_id uuid,p_client_request_id uuid,
 p_message text,p_kind text,p_plan jsonb,p_title text,p_story text,p_reveal_mode text,p_hint text default ''
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid(); v_id uuid; v_existing hs_invitation_internal.invitations%rowtype;
begin
 if v_user is null or p_recipient_id is null or p_recipient_id=v_user or p_client_request_id is null then
  raise exception 'Choose a connected partner before sending' using errcode='42501';
 end if;
 perform hs_invitation_internal.require_pair(p_heart_stone_id,v_user,p_recipient_id);
 -- Serialize duplicate clicks/retries before checking the idempotency key.
 perform pg_advisory_xact_lock(hashtextextended(v_user::text||p_client_request_id::text,0));
 select * into v_existing from hs_invitation_internal.invitations where sender_id=v_user and client_request_id=p_client_request_id;
 if found then
  if (v_existing.heart_stone_id,v_existing.recipient_id,v_existing.message,v_existing.kind,v_existing.plan,v_existing.title,v_existing.story,v_existing.reveal_mode,v_existing.hint)
    is distinct from (p_heart_stone_id,p_recipient_id,btrim(p_message),p_kind,p_plan,btrim(p_title),btrim(p_story),p_reveal_mode,coalesce(btrim(p_hint),'')) then
   raise exception 'This send request belongs to a different invitation';
  end if;
  return v_existing.id;
 end if;
 insert into hs_invitation_internal.invitations(heart_stone_id,sender_id,recipient_id,client_request_id,message,kind,plan,title,story,reveal_mode,hint)
 values(p_heart_stone_id,v_user,p_recipient_id,p_client_request_id,btrim(p_message),p_kind,p_plan,btrim(p_title),btrim(p_story),p_reveal_mode,coalesce(btrim(p_hint),''))
 returning id into v_id;
 return v_id;
end; $$;

create function hs_invitation_internal.respond_invitation(p_invitation_id uuid,p_response text,p_note text default '')
returns text language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; v_note text:=coalesce(btrim(p_note),'');
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or v.recipient_id<>auth.uid() then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if p_response is null or p_response not in ('accepted','declined','reschedule') or char_length(v_note)>400 then raise exception 'Invalid response'; end if;
 if p_response<>'reschedule' then v_note:=''; end if;
 if v.status=p_response and v.response_note=v_note then return v.status; end if;
 if v.status<>'pending' then raise exception 'This invitation has already been answered or closed'; end if;
 update hs_invitation_internal.invitations set status=p_response,response_note=v_note,responded_at=now() where id=v.id;
 return p_response;
end; $$;

create function hs_invitation_internal.cancel_invitation(p_invitation_id uuid)
returns text language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype;
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or auth.uid() not in (v.sender_id,v.recipient_id) then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if v.status='cancelled' then return v.status; end if;
 if v.status not in ('pending','accepted','reschedule') then raise exception 'This invitation is already closed'; end if;
 update hs_invitation_internal.invitations set status='cancelled',cancelled_at=now(),cancelled_by=auth.uid() where id=v.id;
 return 'cancelled';
end; $$;

create function hs_invitation_internal.list_invitations(p_heart_stone_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=p_heart_stone_id and user_id=v_user and status='active') then
  raise exception 'Invitation unavailable' using errcode='42501';
 end if;
 return coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (
 select i.id,i.heart_stone_id,i.sender_id,i.recipient_id,i.message,i.kind,i.plan,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.title else 'A little surprise for us' end as title,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.story when i.reveal_mode='hint' then i.hint else 'A little surprise is waiting for us.' end as story,
 i.reveal_mode,i.status,i.response_note,i.created_at,i.responded_at,i.cancelled_at,i.cancelled_by
 from hs_invitation_internal.invitations i
 where i.heart_stone_id=p_heart_stone_id and v_user in(i.sender_id,i.recipient_id)
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.sender_id and status='active')
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.recipient_id and status='active')
 order by i.created_at desc,i.id limit 50
 ) q),'[]'::jsonb);
end; $$;

create function public.send_moment_invitation(p_heart_stone_id uuid,p_recipient_id uuid,p_client_request_id uuid,p_message text,p_kind text,p_plan jsonb,p_title text,p_story text,p_reveal_mode text,p_hint text default '')
returns uuid language sql security invoker set search_path='' as $$
 select hs_invitation_internal.send_invitation(p_heart_stone_id,p_recipient_id,p_client_request_id,p_message,p_kind,p_plan,p_title,p_story,p_reveal_mode,p_hint);
$$;
create function public.respond_moment_invitation(p_invitation_id uuid,p_response text,p_note text default '')
returns text language sql security invoker set search_path='' as $$ select hs_invitation_internal.respond_invitation(p_invitation_id,p_response,p_note); $$;
create function public.cancel_moment_invitation(p_invitation_id uuid)
returns text language sql security invoker set search_path='' as $$ select hs_invitation_internal.cancel_invitation(p_invitation_id); $$;
create function public.list_moment_invitations(p_heart_stone_id uuid)
returns jsonb language sql security invoker set search_path='' as $$ select hs_invitation_internal.list_invitations(p_heart_stone_id); $$;

revoke all on function hs_invitation_internal.send_invitation(uuid,uuid,uuid,text,text,jsonb,text,text,text,text) from public,anon,authenticated;
revoke all on function hs_invitation_internal.respond_invitation(uuid,text,text) from public,anon,authenticated;
revoke all on function hs_invitation_internal.cancel_invitation(uuid) from public,anon,authenticated;
revoke all on function hs_invitation_internal.list_invitations(uuid) from public,anon,authenticated;
grant execute on function hs_invitation_internal.send_invitation(uuid,uuid,uuid,text,text,jsonb,text,text,text,text),hs_invitation_internal.respond_invitation(uuid,text,text),hs_invitation_internal.cancel_invitation(uuid),hs_invitation_internal.list_invitations(uuid) to authenticated;
revoke all on function public.send_moment_invitation(uuid,uuid,uuid,text,text,jsonb,text,text,text,text),public.respond_moment_invitation(uuid,text,text),public.cancel_moment_invitation(uuid),public.list_moment_invitations(uuid) from public,anon,authenticated;
grant execute on function public.send_moment_invitation(uuid,uuid,uuid,text,text,jsonb,text,text,text,text),public.respond_moment_invitation(uuid,text,text),public.cancel_moment_invitation(uuid),public.list_moment_invitations(uuid) to authenticated;
comment on table hs_invitation_internal.invitations is 'Operational partner invitations. No direct client access. Server-redacted surprises; no memory/profile-learning writes.';
notify pgrst,'reload schema';

create policy invitation_no_direct_client_access on hs_invitation_internal.invitations for all to authenticated using (false) with check (false);
