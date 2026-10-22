-- Review candidate; requires shared-date-server.sql. Apply atomically after
-- deploying explicit connection selection. Existing relationship IDs stay intact.
create schema hs_connection_internal;
revoke all on schema hs_connection_internal from public,anon,authenticated;
grant usage on schema hs_connection_internal to authenticated;
drop index public.one_active_heart_stone_per_user;
create index memberships_user_active_idx on public.heart_stone_memberships(user_id,heart_stone_id) where status='active';

create function hs_connection_internal.create_invitation(p_partner_email text,p_partner_first_name text,p_expires_hours integer)
returns table(heart_stone_id uuid,invitation_id uuid,invitation_token text,expires_at timestamptz)
language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_hs uuid;v_inv uuid;v_token text;v_exp timestamptz;v_email text:=lower(btrim(coalesce(p_partner_email,'')));
begin
 if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 perform hs_shared_dates.require_adults(array[v_user]);
 if char_length(v_email) not between 3 and 254 or position('@' in v_email)=0 then raise exception 'PARTNER_EMAIL_REQUIRED';end if;
 if v_email=public.current_user_email() then raise exception 'CANNOT_INVITE_SELF';end if;
 -- A new invitation creates a separate relationship, never adds a third person
 -- to an existing pair and never copies the caller's other relationship data.
 insert into public.heart_stones(created_by_user_id,status) values(v_user,'pending_partner') returning id into v_hs;
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status) values(v_hs,v_user,'pending_connection');
 v_token:=encode(extensions.gen_random_bytes(32),'hex');
 v_exp:=now()+make_interval(hours=>greatest(1,least(coalesce(p_expires_hours,72),168)));
 insert into public.partner_invitations(heart_stone_id,inviter_user_id,invite_email,invite_first_name,token_hash,status,expires_at)
 values(v_hs,v_user,v_email,nullif(left(btrim(p_partner_first_name),80),''),encode(extensions.digest(v_token,'sha256'),'hex'),'pending',v_exp) returning id into v_inv;
 return query select v_hs,v_inv,v_token,v_exp;
end;$$;

create function hs_connection_internal.accept_invitation(p_token text)
returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_inv public.partner_invitations%rowtype;v_count integer;
begin
 if v_user is null then raise exception 'AUTH_REQUIRED' using errcode='42501';end if;
 if p_token is null or char_length(p_token)<>64 then raise exception 'INVITATION_NOT_AVAILABLE';end if;
 select * into v_inv from public.partner_invitations where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') for update;
 if not found then raise exception 'INVITATION_NOT_AVAILABLE';end if;
 if v_inv.invite_email<>public.current_user_email() then raise exception 'INVITATION_NOT_FOR_ACCOUNT' using errcode='42501';end if;
 if v_inv.inviter_user_id=v_user then raise exception 'CANNOT_ACCEPT_OWN_INVITATION';end if;
 perform hs_shared_dates.require_adults(array[v_user,v_inv.inviter_user_id]);
 perform 1 from public.heart_stones where id=v_inv.heart_stone_id for update;
 if v_inv.status='accepted' and exists(select 1 from public.heart_stone_memberships where heart_stone_id=v_inv.heart_stone_id and user_id=v_user and status='active') then return v_inv.heart_stone_id;end if;
 if v_inv.status<>'pending' or v_inv.expires_at<=now() then raise exception 'INVITATION_NOT_AVAILABLE';end if;
 select count(*) into v_count from public.heart_stone_memberships where heart_stone_id=v_inv.heart_stone_id and status in ('active','pending_connection');
 if v_count<>1 or not exists(select 1 from public.heart_stone_memberships where heart_stone_id=v_inv.heart_stone_id and user_id=v_inv.inviter_user_id and status='pending_connection') then raise exception 'INVITATION_CONNECTION_CHANGED';end if;
 insert into public.heart_stone_memberships(heart_stone_id,user_id,status,joined_at) values(v_inv.heart_stone_id,v_user,'active',now());
 update public.heart_stone_memberships set status='active',joined_at=coalesce(joined_at,now()) where heart_stone_id=v_inv.heart_stone_id and user_id=v_inv.inviter_user_id;
 update public.heart_stones set status='connected',connected_at=now() where id=v_inv.heart_stone_id;
 update public.partner_invitations set status='accepted',accepted_at=now() where id=v_inv.id;
 insert into public.consent_events(user_id,consent_type,version,action) values(v_user,'heart_stone_connection','v1','granted');
 return v_inv.heart_stone_id;
end;$$;

create or replace function public.create_heart_stone_invitation(p_partner_email text,p_partner_first_name text default null,p_expires_hours integer default 72)
returns table(heart_stone_id uuid,invitation_id uuid,invitation_token text,expires_at timestamptz)
language sql security invoker set search_path='' as $$select * from hs_connection_internal.create_invitation(p_partner_email,p_partner_first_name,p_expires_hours);$$;
create or replace function public.accept_heart_stone_invitation(p_token text)
returns uuid language sql security invoker set search_path='' as $$select hs_connection_internal.accept_invitation(p_token);$$;

CREATE OR REPLACE FUNCTION hs_connection_internal.bootstrap(p_selected uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public', 'extensions'
AS $function$
declare
    v_user uuid := auth.uid();
    v_profile public.profiles%rowtype;
    v_heart_stone_id uuid;
    v_heart_stone jsonb;
    v_readiness jsonb;
begin
    if v_user is null then
        raise exception 'AUTH_REQUIRED';
    end if;

    select *
      into v_profile
      from public.profiles
     where id=v_user;

    if not found then
        raise exception 'PROFILE_NOT_FOUND';
    end if;

    if p_selected is not null then
        perform public.require_active_heart_stone_member(p_selected);
        v_heart_stone_id:=p_selected;
    else
        if (select count(*) from public.heart_stone_memberships where user_id=v_user and status='active')>1 then
            raise exception 'CONNECTION_SELECTION_REQUIRED';
        end if;
        select heart_stone_id into v_heart_stone_id from public.heart_stone_memberships where user_id=v_user and status='active';
    end if;

    if v_heart_stone_id is not null then
        perform public.require_active_heart_stone_member(v_heart_stone_id);

        v_readiness := public.get_alpha_readiness(v_heart_stone_id);

        select jsonb_build_object(
            'id',hs.id,
            'display_name',hs.display_name,
            'status',hs.status,
            'shared_onboarding_complete',hs.shared_onboarding_complete,
            'connected_at',hs.connected_at,
            'readiness',v_readiness,
            'quest_state',public.get_alpha_quest_state(hs.id)
        )
        into v_heart_stone
        from public.heart_stones hs
        where hs.id=v_heart_stone_id;
    end if;

    return jsonb_build_object(
        'user',jsonb_build_object(
            'id',v_profile.id,
            'first_name',v_profile.first_name,
            'age_eligible',v_profile.age_eligible,
            'region',v_profile.region,
            'account_status',v_profile.account_status,
            'private_onboarding_complete',v_profile.private_onboarding_complete
        ),
        'heart_stone',v_heart_stone,
        'has_active_heart_stone',(v_heart_stone_id is not null),
        'alpha_ready',coalesce((v_readiness->>'alpha_ready')::boolean,false)
    );
end;
$function$;

create or replace function public.get_alpha_bootstrap()
returns jsonb language sql security invoker set search_path='' as $$select hs_connection_internal.bootstrap(null);$$;
create function public.get_alpha_bootstrap_for(p_heart_stone_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select hs_connection_internal.bootstrap(p_heart_stone_id);$$;
revoke all on all functions in schema hs_connection_internal from public,anon,authenticated;
grant execute on all functions in schema hs_connection_internal to authenticated;
revoke all on function public.create_heart_stone_invitation(text,text,integer),public.accept_heart_stone_invitation(text),public.get_alpha_bootstrap(),public.get_alpha_bootstrap_for(uuid) from public,anon;
grant execute on function public.create_heart_stone_invitation(text,text,integer),public.accept_heart_stone_invitation(text),public.get_alpha_bootstrap(),public.get_alpha_bootstrap_for(uuid) to authenticated;
