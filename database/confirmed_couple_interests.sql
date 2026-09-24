-- A proposal is visible to the couple, but is not a confirmed US preference
-- until the other active partner explicitly approves it.
create table public.couple_interest_proposals (
  id uuid primary key default gen_random_uuid(),
  heart_stone_id uuid not null references public.heart_stones(id) on delete cascade,
  proposed_by uuid not null references public.profiles(id) on delete cascade,
  interest_key text not null check (interest_key ~ '^first_journey_interest_[a-z0-9_]{1,60}$'),
  created_at timestamptz not null default now(),
  unique (heart_stone_id, interest_key)
);
create table public.couple_interest_approvals (
  proposal_id uuid primary key references public.couple_interest_proposals(id) on delete cascade,
  approved_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.couple_interest_proposals enable row level security;
alter table public.couple_interest_approvals enable row level security;
revoke all on public.couple_interest_proposals, public.couple_interest_approvals from anon;
grant select, insert, delete on public.couple_interest_proposals, public.couple_interest_approvals to authenticated;

create policy couple_interest_proposals_read on public.couple_interest_proposals
for select to authenticated using (public.is_active_heart_stone_member(heart_stone_id));
create policy couple_interest_proposals_insert on public.couple_interest_proposals
for insert to authenticated with check (
  proposed_by = (select auth.uid()) and public.is_active_heart_stone_member(heart_stone_id)
  and (select count(*) from public.heart_stone_memberships m where m.heart_stone_id = couple_interest_proposals.heart_stone_id and m.status='active') = 2
);
create policy couple_interest_proposals_delete on public.couple_interest_proposals
for delete to authenticated using (proposed_by = (select auth.uid()));

create policy couple_interest_approvals_read on public.couple_interest_approvals
for select to authenticated using (
  exists (select 1 from public.couple_interest_proposals p
          where p.id = proposal_id and public.is_active_heart_stone_member(p.heart_stone_id))
);
create policy couple_interest_approvals_insert on public.couple_interest_approvals
for insert to authenticated with check (
  approved_by = (select auth.uid())
  and exists (select 1 from public.couple_interest_proposals p
              join public.heart_stone_memberships m on m.heart_stone_id=p.heart_stone_id
              where p.id=proposal_id and p.proposed_by <> (select auth.uid())
                and m.user_id=p.proposed_by and m.status='active'
                and public.is_active_heart_stone_member(p.heart_stone_id))
);
create policy couple_interest_approvals_delete on public.couple_interest_approvals
for delete to authenticated using (approved_by = (select auth.uid()));

create view public.confirmed_couple_interests with (security_invoker=true) as
select p.heart_stone_id,p.interest_key,p.id as proposal_id
from public.couple_interest_proposals p
join public.couple_interest_approvals a on a.proposal_id=p.id
where public.is_active_heart_stone_member(p.heart_stone_id)
  and p.proposed_by <> a.approved_by
  and exists (select 1 from public.heart_stone_memberships m
              where m.heart_stone_id=p.heart_stone_id and m.user_id=p.proposed_by and m.status='active')
  and exists (select 1 from public.heart_stone_memberships m
              where m.heart_stone_id=p.heart_stone_id and m.user_id=a.approved_by and m.status='active');
revoke all on public.confirmed_couple_interests from anon;
grant select on public.confirmed_couple_interests to authenticated;
