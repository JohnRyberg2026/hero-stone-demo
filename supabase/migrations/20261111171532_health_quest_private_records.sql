-- Development only. Apply to an isolated test database before deployment.
create schema if not exists health_quest_internal;
revoke all on schema health_quest_internal from public, anon, authenticated;
create table public.health_quest_records (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 id uuid not null, kind text not null check(kind in ('goal','observation')),
 text text not null check(char_length(text)<=2000),
 state text not null check(state in ('planned','reported','paused','completed','deleted')),
 followup boolean not null default false,
 occurred_at timestamptz, revision integer not null check(revision>0),
 last_action_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 primary key(owner_id,id),
 check(state='deleted' or char_length(trim(text))>0),
 check(state<>'deleted' or (text='' and not followup and occurred_at is null))
);
alter table public.health_quest_records enable row level security;
revoke all on public.health_quest_records from public,anon,authenticated;
grant select,insert,update on public.health_quest_records to authenticated;
create policy health_records_owner on public.health_quest_records for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

-- Metadata only: historical health text is never copied into audit events.
create table health_quest_internal.record_events (
 owner_id uuid not null, record_id uuid not null, action_id uuid not null,
 revision integer not null, state text not null, recorded_at timestamptz not null default now(),
 primary key(owner_id,action_id),
 foreign key(owner_id,record_id) references public.health_quest_records(owner_id,id) on delete cascade
);
alter table health_quest_internal.record_events enable row level security;
revoke all on health_quest_internal.record_events from public,anon,authenticated;

create function health_quest_internal.guard_record() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.owner_id<>old.owner_id or new.id<>old.id or new.kind<>old.kind then
   raise exception 'Record identity cannot change' using errcode='42501';
  end if;
  if old.state='deleted' then raise exception 'Deleted record cannot be restored';end if;
  if new.revision<>old.revision+1 then raise exception 'Invalid revision';end if;
  new.created_at:=old.created_at;
 else
  if new.revision<>1 then raise exception 'Invalid initial revision';end if;
  new.created_at:=now();
 end if;
 new.updated_at:=now();
 return new;
end;$$;
revoke all on function health_quest_internal.guard_record() from public,anon,authenticated;
create trigger health_record_guard before insert or update on public.health_quest_records
 for each row execute function health_quest_internal.guard_record();

-- Narrow privileged trigger: only writes metadata for the authenticated owner's row.
create function health_quest_internal.audit_record() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or new.owner_id<>auth.uid() then
  raise exception 'Expected signed-in owner' using errcode='42501';end if;
 insert into health_quest_internal.record_events(owner_id,record_id,action_id,revision,state)
 values(new.owner_id,new.id,new.last_action_id,new.revision,new.state);
 return new;
end;$$;
revoke all on function health_quest_internal.audit_record() from public,anon,authenticated;
create trigger health_record_audit after insert or update on public.health_quest_records
 for each row execute function health_quest_internal.audit_record();

create function public.health_quest_save_record(
 p_expected_user uuid,p_id uuid,p_kind text,p_text text,p_state text,
 p_followup boolean,p_occurred_at timestamptz,p_revision integer,p_action_id uuid,p_approved boolean
) returns jsonb language plpgsql security invoker set search_path='' as $$
declare v public.health_quest_records%rowtype;
begin
 if auth.uid() is null or p_expected_user is distinct from auth.uid() then
  raise exception 'Account changed' using errcode='42501';end if;
 if p_approved is distinct from true then raise exception 'Approval required';end if;
 if p_id is null or p_action_id is null or p_revision is null or p_revision<0
 or p_kind is null or p_kind not in('goal','observation') or p_text is null
 or char_length(trim(p_text))=0 or char_length(p_text)>2000 or p_followup is null
 or p_state is null or p_state not in('planned','reported','paused','completed','deleted') then
  raise exception 'Invalid record';end if;
 perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
 select * into v from public.health_quest_records where owner_id=auth.uid() and id=p_id;
 if found and v.last_action_id=p_action_id then
  if v.kind is distinct from p_kind or v.state is distinct from p_state
   or v.text is distinct from (case when p_state='deleted' then '' else trim(p_text) end)
   or v.followup is distinct from (case when p_state='deleted' then false else p_followup end)
   or v.occurred_at is distinct from (case when p_state='deleted' then null else p_occurred_at end)
   or v.revision<>p_revision+1 then raise exception 'Action reused with different input';end if;
  return to_jsonb(v);
 end if;
 if p_revision<>coalesce(v.revision,0) then raise exception 'Record changed; reload before saving';end if;
 if v.state='deleted' then raise exception 'Deleted record cannot be restored';end if;
 if v.id is not null and v.kind<>p_kind then raise exception 'Record kind cannot change';end if;
 insert into public.health_quest_records(owner_id,id,kind,text,state,followup,occurred_at,revision,last_action_id)
 values(auth.uid(),p_id,p_kind,case when p_state='deleted' then '' else trim(p_text) end,p_state,
 case when p_state='deleted' then false else p_followup end,
 case when p_state='deleted' then null else p_occurred_at end,1,p_action_id)
 on conflict(owner_id,id) do update set text=excluded.text,state=excluded.state,
 followup=excluded.followup,occurred_at=excluded.occurred_at,
 revision=health_quest_records.revision+1,last_action_id=excluded.last_action_id
 returning * into v;
 return to_jsonb(v);
end;$$;
revoke all on function public.health_quest_save_record(uuid,uuid,text,text,text,boolean,timestamptz,integer,uuid,boolean) from public,anon;
grant execute on function public.health_quest_save_record(uuid,uuid,text,text,text,boolean,timestamptz,integer,uuid,boolean) to authenticated;
