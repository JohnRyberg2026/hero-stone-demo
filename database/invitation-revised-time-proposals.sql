alter table hs_invitation_internal.invitations
 add column revision integer not null default 0 check (revision>=0),
 add column revision_request_id uuid,
 add column schedule_history jsonb not null default '[]'::jsonb;

create function hs_invitation_internal.respond_revision(p_invitation_id uuid,p_expected_revision integer,p_response text,p_note text default '')
returns text language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; v_note text:=coalesce(btrim(p_note),'');
begin
 if auth.uid() is null then raise exception 'Sign in first' using errcode='42501'; end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or v.recipient_id<>auth.uid() then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if p_expected_revision is null or v.revision<>p_expected_revision then raise exception 'The proposed time changed. Refresh invitations before replying'; end if;
 if p_response is null or p_response not in ('accepted','declined','reschedule') or char_length(v_note)>400 then raise exception 'Invalid response'; end if;
 if p_response<>'reschedule' then v_note:=''; end if;
 if v.status=p_response and v.response_note=v_note then return v.status; end if;
 if v.status<>'pending' then raise exception 'This invitation has already been answered or closed'; end if;
 update hs_invitation_internal.invitations set status=p_response,response_note=v_note,responded_at=now() where id=v.id;
 return p_response;
end; $$;
revoke all on function hs_invitation_internal.respond_revision(uuid,integer,text,text) from public,anon;
grant execute on function hs_invitation_internal.respond_revision(uuid,integer,text,text) to authenticated;

-- Older clients can respond only to the original schedule.
create or replace function hs_invitation_internal.respond_invitation(p_invitation_id uuid,p_response text,p_note text default '')
returns text language sql security invoker set search_path='' as $$
 select hs_invitation_internal.respond_revision(p_invitation_id,0,p_response,p_note);
$$;

create function public.respond_moment_invitation_revision(p_invitation_id uuid,p_expected_revision integer,p_response text,p_note text default '')
returns text language sql security invoker set search_path='' as $$
 select hs_invitation_internal.respond_revision(p_invitation_id,p_expected_revision,p_response,p_note);
$$;
revoke all on function public.respond_moment_invitation_revision(uuid,integer,text,text) from public,anon;
grant execute on function public.respond_moment_invitation_revision(uuid,integer,text,text) to authenticated;

create function hs_invitation_internal.propose_time(p_invitation_id uuid,p_expected_sender uuid,p_expected_revision integer,p_request_id uuid,p_date text,p_time text,p_zone text)
returns integer language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; new_plan jsonb; proposed_at timestamptz;
begin
 if auth.uid() is null or auth.uid()<>p_expected_sender then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or v.sender_id<>auth.uid() then raise exception 'Invitation unavailable' using errcode='42501'; end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if p_request_id is null or p_expected_revision is null then raise exception 'Invalid proposal'; end if;
 if p_date is null or p_date !~ '^\d{4}-\d{2}-\d{2}$' or p_time is null or p_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 or p_zone is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=p_zone) then raise exception 'Choose a valid date, time and time zone'; end if;
 new_plan:=v.plan||jsonb_build_object('whenMode','specific','momentDate',p_date,'momentTime',p_time,'momentZone',p_zone);
 if v.revision=p_expected_revision+1 and v.revision_request_id=p_request_id and v.plan=new_plan then return v.revision; end if;
 if v.revision<>p_expected_revision or v.status<>'reschedule' then raise exception 'This invitation changed. Refresh before proposing a time'; end if;
 proposed_at:=(p_date::date+p_time::time) at time zone p_zone;
 if proposed_at<=now() then raise exception 'Choose a future date and time'; end if;
 update hs_invitation_internal.invitations
 set schedule_history=schedule_history||jsonb_build_array(jsonb_build_object('revision',v.revision,'plan',v.plan,'suggestion',v.response_note,'replaced_at',now())),
 plan=new_plan,revision=revision+1,revision_request_id=p_request_id,status='pending',responded_at=null
 where id=v.id;
 return v.revision+1;
end; $$;
revoke all on function hs_invitation_internal.propose_time(uuid,uuid,integer,uuid,text,text,text) from public,anon;
grant execute on function hs_invitation_internal.propose_time(uuid,uuid,integer,uuid,text,text,text) to authenticated;

create function public.propose_moment_invitation_time(p_invitation_id uuid,p_expected_sender uuid,p_expected_revision integer,p_request_id uuid,p_date text,p_time text,p_zone text)
returns integer language sql security invoker set search_path='' as $$
 select hs_invitation_internal.propose_time(p_invitation_id,p_expected_sender,p_expected_revision,p_request_id,p_date,p_time,p_zone);
$$;
revoke all on function public.propose_moment_invitation_time(uuid,uuid,integer,uuid,text,text,text) from public,anon;
grant execute on function public.propose_moment_invitation_time(uuid,uuid,integer,uuid,text,text,text) to authenticated;

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
 return coalesce((select jsonb_agg(to_jsonb(q) order by q.created_at desc) from (
 select i.id,i.heart_stone_id,i.sender_id,i.recipient_id,i.message,i.kind,i.plan,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.title else 'A little surprise for us' end as title,
 case when i.sender_id=v_user or i.reveal_mode='all' or i.status='accepted' then i.story when i.reveal_mode='hint' then i.hint else 'A little surprise is waiting for us.' end as story,
 i.revision,i.reveal_mode,i.status,i.response_note,i.created_at,i.responded_at,i.cancelled_at,i.cancelled_by
 from hs_invitation_internal.invitations i
 where i.heart_stone_id=p_heart_stone_id and v_user in(i.sender_id,i.recipient_id)
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.sender_id and status='active')
 and exists(select 1 from public.heart_stone_memberships where heart_stone_id=i.heart_stone_id and user_id=i.recipient_id and status='active')
 order by i.created_at desc,i.id limit 50
 ) q),'[]'::jsonb);
end; $function$
