-- Separate proposal state preserves the accepted invitation until both agree.
alter table hs_invitation_internal.invitations add column schedule_proposal jsonb not null default '{}'::jsonb, add column schedule_version integer not null default 0;
create function hs_invitation_internal.schedule_moment(p_invitation_id uuid,p_expected_user uuid,p_action text,p_version integer default null,p_details jsonb default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v hs_invitation_internal.invitations%rowtype; d jsonb; stamp timestamptz; z text; dt text; tm text; place text; duration text;
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 select * into v from hs_invitation_internal.invitations where id=p_invitation_id for update;
 if not found or auth.uid() not in(v.sender_id,v.recipient_id) then raise exception 'Moment unavailable' using errcode='42501';end if;
 perform hs_invitation_internal.require_pair(v.heart_stone_id,v.sender_id,v.recipient_id);
 if v.status<>'accepted' then raise exception 'Refresh this accepted invitation';end if;
 if p_action is null or p_action not in('load','propose','confirm','withdraw') then raise exception 'Invalid action';end if;
 if p_action<>'load' then
  if v.started_at is not null or v.completed_at is not null then raise exception 'This moment has already begun';end if;
  if p_version is null or p_version<>v.schedule_version then raise exception 'Details changed. Refresh before continuing';end if;
  if p_action='propose' then
   if p_details is null or jsonb_typeof(p_details)<>'object' then raise exception 'Add your details';end if;
   if exists(select 1 from jsonb_each(p_details) e where e.key not in('date','time','zone','place','duration') or jsonb_typeof(e.value)<>'string') then raise exception 'Invalid details';end if;
   dt:=p_details->>'date';tm:=p_details->>'time';z:=p_details->>'zone';place:=btrim(p_details->>'place');duration:=btrim(coalesce(p_details->>'duration',''));
   if dt is null or dt !~ '^\d{4}-\d{2}-\d{2}$' or tm is null or tm !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or z is null or not exists(select 1 from pg_catalog.pg_timezone_names where name=z) or place is null or char_length(place) not between 1 and 240 or char_length(duration)>120 then raise exception 'Choose a valid day, time, time zone and meeting place';end if;
   stamp:=(dt::date+tm::time) at time zone z;
   if stamp<=now() then raise exception 'Choose a future time';end if;
   d:=jsonb_build_object('date',dt,'time',tm,'zone',z,'place',place,'duration',duration,'proposed_by',auth.uid(),'status','pending');
  elsif p_action='confirm' then
   if v.schedule_proposal->>'status' is distinct from 'pending' or v.schedule_proposal->>'proposed_by'=auth.uid()::text then raise exception 'Only your partner can confirm this proposal';end if;
   if ((v.schedule_proposal->>'date')::date+(v.schedule_proposal->>'time')::time) at time zone (v.schedule_proposal->>'zone')<=now() then raise exception 'Choose a future time';end if;
   d:=v.schedule_proposal||jsonb_build_object('status','confirmed','confirmed_by',auth.uid());
   update hs_invitation_internal.invitations set plan=plan||jsonb_build_object('whenMode','specific','momentDate',d->>'date','momentTime',d->>'time','momentZone',d->>'zone','meetMode','place','meetPlace',d->>'place','length',d->>'duration'),revision=revision+1 where id=v.id;
  else
   if v.schedule_proposal->>'status' is distinct from 'pending' then raise exception 'No pending proposal';end if;
   d:='{}'::jsonb;
  end if;
  update hs_invitation_internal.invitations set schedule_proposal=d,schedule_version=schedule_version+1 where id=v.id returning * into v;
 end if;
 return jsonb_build_object('version',v.schedule_version,'revision',v.revision,'proposal',v.schedule_proposal,'plan',v.plan);
end;$$;
revoke all on function hs_invitation_internal.schedule_moment(uuid,uuid,text,integer,jsonb) from public,anon;
grant execute on function hs_invitation_internal.schedule_moment(uuid,uuid,text,integer,jsonb) to authenticated;
create function public.shared_moment_schedule(p_invitation_id uuid,p_expected_user uuid,p_action text default 'load',p_version integer default null,p_details jsonb default null)
returns jsonb language sql security invoker set search_path='' as $$select hs_invitation_internal.schedule_moment(p_invitation_id,p_expected_user,p_action,p_version,p_details);$$;
revoke all on function public.shared_moment_schedule(uuid,uuid,text,integer,jsonb) from public,anon;
grant execute on function public.shared_moment_schedule(uuid,uuid,text,integer,jsonb) to authenticated;

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
 if v.schedule_proposal->>'status'='pending' then raise exception 'Agree on your proposed time and place before beginning';end if;
 update hs_invitation_internal.invitations set started_at=now() where id=v.id returning started_at into stamp;
 return stamp;
end; $$;
