-- Reject missing as well as mismatched expected account IDs.
CREATE OR REPLACE FUNCTION hs_invitation_internal.my_picture(p_expected_user uuid, p_picture text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then raise exception 'Account changed' using errcode='42501'; end if;
 if p_picture is not null then
 insert into hs_invitation_internal.profile_pictures values(auth.uid(),p_picture) on conflict(user_id) do update set picture=excluded.picture;
 end if;
 return coalesce((select picture from hs_invitation_internal.profile_pictures where user_id=auth.uid()),'initials');
end;$function$;

CREATE OR REPLACE FUNCTION hs_invitation_internal.propose_time(p_invitation_id uuid, p_expected_sender uuid, p_expected_revision integer, p_request_id uuid, p_date text, p_time text, p_zone text)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v hs_invitation_internal.invitations%rowtype; new_plan jsonb; proposed_at timestamptz;
begin
 if auth.uid() is null or p_expected_sender is distinct from auth.uid() then raise exception 'Invitation unavailable' using errcode='42501'; end if;
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
end; $function$;
