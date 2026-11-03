-- Server-only request reservations. One bounded row/account, no conversation text.
create schema hs_usage_internal;
revoke all on schema hs_usage_internal from public,anon,authenticated;
grant usage on schema hs_usage_internal to service_role;
create table hs_usage_internal.conversation_usage(
 user_id uuid primary key references auth.users(id) on delete cascade,
 usage_day date not null,
 daily_count integer not null default 0 check(daily_count between 0 and 100),
 recent timestamptz[] not null default '{}' check(cardinality(recent)<=6)
);
alter table hs_usage_internal.conversation_usage enable row level security;
create policy no_direct_client_access on hs_usage_internal.conversation_usage for all to anon,authenticated using(false) with check(false);
revoke all on hs_usage_internal.conversation_usage from public,anon,authenticated;
grant select,insert,update on hs_usage_internal.conversation_usage to service_role;
create function public.reserve_heartstone_conversation(p_user_id uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare r hs_usage_internal.conversation_usage%rowtype; t timestamptz; d date; live timestamptz[]; wait_seconds integer;
begin
 if p_user_id is null then raise exception 'Verified account required';end if;
 insert into hs_usage_internal.conversation_usage(user_id,usage_day)
 values(p_user_id,(clock_timestamp() at time zone 'UTC')::date) on conflict(user_id) do nothing;
 select * into strict r from hs_usage_internal.conversation_usage where user_id=p_user_id for update;
 -- Read time after the row lock: concurrent Edge workers serialize on this account.
 t:=clock_timestamp();d:=(t at time zone 'UTC')::date;
 if r.usage_day<>d then r.daily_count:=0;end if;
 live:=array(select x from unnest(r.recent) x where x>t-interval '60 seconds' order by x);
 if r.daily_count>=100 then
  wait_seconds:=greatest(1,ceil(extract(epoch from (((d+1)::timestamp at time zone 'UTC')-t)))::integer);
  return jsonb_build_object('allowed',false,'scope','day','retryAfterSeconds',wait_seconds);
 end if;
 if cardinality(live)>=6 then
  wait_seconds:=greatest(1,ceil(extract(epoch from (live[1]+interval '60 seconds'-t)))::integer);
  return jsonb_build_object('allowed',false,'scope','minute','retryAfterSeconds',wait_seconds);
 end if;
 update hs_usage_internal.conversation_usage set usage_day=d,daily_count=r.daily_count+1,recent=array_append(live,t) where user_id=p_user_id;
 return jsonb_build_object('allowed',true,'scope',null,'retryAfterSeconds',0);
end;$$;
revoke all on function public.reserve_heartstone_conversation(uuid) from public,anon,authenticated;
grant execute on function public.reserve_heartstone_conversation(uuid) to service_role;
