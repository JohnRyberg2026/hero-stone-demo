-- One-way, explicitly approved snapshot of a broad interest for a linked partner.
-- The owner's private onboarding answer remains owner-only.
create table public.profile_interest_shares (
  id uuid primary key default gen_random_uuid(),
  heart_stone_id uuid not null references public.heart_stones(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  question_key text not null check (question_key ~ '^first_journey_interest_[a-z0-9_]{1,60}$'),
  shared_choice text not null check (shared_choice in ('like','dislike','unsure')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (heart_stone_id, owner_id, question_key),
  check (owner_id <> recipient_id)
);

alter table public.profile_interest_shares enable row level security;
revoke all on public.profile_interest_shares from anon;
grant select, insert, update, delete on public.profile_interest_shares to authenticated;

create policy profile_interest_shares_read on public.profile_interest_shares
for select to authenticated using (
  (owner_id = (select auth.uid()) or recipient_id = (select auth.uid()))
  and public.is_active_heart_stone_member(heart_stone_id)
  and exists (select 1 from public.heart_stone_memberships m
              where m.heart_stone_id = profile_interest_shares.heart_stone_id
                and m.user_id = profile_interest_shares.owner_id and m.status = 'active')
  and exists (select 1 from public.heart_stone_memberships m
              where m.heart_stone_id = profile_interest_shares.heart_stone_id
                and m.user_id = profile_interest_shares.recipient_id and m.status = 'active')
);
create policy profile_interest_shares_insert on public.profile_interest_shares
for insert to authenticated with check (
  owner_id = (select auth.uid())
  and public.is_active_heart_stone_member(heart_stone_id)
  and exists (select 1 from public.heart_stone_memberships m
              where m.heart_stone_id = profile_interest_shares.heart_stone_id
                and m.user_id = profile_interest_shares.recipient_id and m.status = 'active')
);
create policy profile_interest_shares_update on public.profile_interest_shares
for update to authenticated
using (owner_id = (select auth.uid()) and public.is_active_heart_stone_member(heart_stone_id))
with check (
  owner_id = (select auth.uid())
  and public.is_active_heart_stone_member(heart_stone_id)
  and exists (select 1 from public.heart_stone_memberships m
              where m.heart_stone_id = profile_interest_shares.heart_stone_id
                and m.user_id = profile_interest_shares.recipient_id and m.status = 'active')
);
create policy profile_interest_shares_delete on public.profile_interest_shares
for delete to authenticated using (owner_id = (select auth.uid()));
