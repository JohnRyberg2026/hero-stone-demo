-- Preserve the existing RPC shape for the demo while withholding optional
-- identity details unless their owner explicitly opts in.
alter table public.profiles
  add column share_pronouns_with_partner boolean not null default false;

create or replace function public.get_heart_stone_partner_personalization(p_heart_stone_id uuid)
returns table(first_name text, gender text, pronouns text)
language sql
security definer
set search_path = public
as $function$
  select p.first_name,
         null::text as gender,
         case when p.share_pronouns_with_partner then p.pronouns else null::text end as pronouns
  from public.heart_stone_memberships me
  join public.heart_stone_memberships partner
    on partner.heart_stone_id = me.heart_stone_id
   and partner.user_id <> me.user_id
   and partner.status = 'active'
  join public.profiles p on p.id = partner.user_id
  where me.heart_stone_id = p_heart_stone_id
    and me.user_id = auth.uid()
    and me.status = 'active'
  limit 1;
$function$;
revoke execute on function public.get_heart_stone_partner_personalization(uuid) from public, anon;
grant execute on function public.get_heart_stone_partner_personalization(uuid) to authenticated;
