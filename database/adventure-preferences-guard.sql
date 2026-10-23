-- Additive review candidate; requires the adventure preferences draft table.
-- Enforces the initial supported schema and optimistic revisions on the server.
create schema hs_profile_rules;
revoke all on schema hs_profile_rules from public;
grant usage on schema hs_profile_rules to authenticated;
create function hs_profile_rules.valid_preferences(b jsonb,i jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare item jsonb;
begin
 if jsonb_typeof(b) is distinct from 'object' or b-array['minimalWalking','avoidCategories','maxBudget']<>'{}'::jsonb or jsonb_typeof(i) is distinct from 'array' then return false;end if;
 if b ? 'minimalWalking' and jsonb_typeof(b->'minimalWalking') is distinct from 'boolean' then return false;end if;
 if b ? 'maxBudget' and (jsonb_typeof(b->'maxBudget') is distinct from 'number' or (b->>'maxBudget')::numeric<0) then return false;end if;
 if b ? 'avoidCategories' then
  if jsonb_typeof(b->'avoidCategories') is distinct from 'array' then return false;end if;
  for item in select value from jsonb_array_elements(b->'avoidCategories') loop
   if jsonb_typeof(item)<>'string' or length(item#>>'{}')>80 then return false;end if;
  end loop;
 end if;
 for item in select value from jsonb_array_elements(i) loop
  if jsonb_typeof(item)<>'string' or length(item#>>'{}')>80 then return false;end if;
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function hs_profile_rules.valid_preferences(jsonb,jsonb) from public;
grant execute on function hs_profile_rules.valid_preferences(jsonb,jsonb) to authenticated;
alter table public.quest_adventure_preferences add constraint supported_preferences check(hs_profile_rules.valid_preferences(boundaries,interests));
create function hs_profile_rules.guard_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='INSERT' then
  if new.revision<>0 then raise exception 'Initial revision must be zero' using errcode='22023';end if;
 elsif new.account_id<>old.account_id or new.revision<>old.revision+1 then
  raise exception 'Profile revision conflict' using errcode='40001';
 end if;
 if new.revision>9007199254740991 then raise exception 'Invalid revision' using errcode='22023';end if;
 new.updated_at:=now();return new;
end $$;
revoke all on function hs_profile_rules.guard_revision() from public;
create trigger guard_revision before insert or update on public.quest_adventure_preferences for each row execute function hs_profile_rules.guard_revision();
