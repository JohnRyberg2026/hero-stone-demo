-- Draft only: not applied to any Supabase project.
-- Private account-scoped adventure preferences. Revision is updated on every write.
create table if not exists public.quest_adventure_preferences (
 account_id uuid primary key references auth.users(id) on delete cascade,
 revision bigint not null default 0 check (revision >= 0),
 boundaries jsonb not null default '{}'::jsonb check (jsonb_typeof(boundaries) = 'object'),
 interests jsonb not null default '[]'::jsonb check (jsonb_typeof(interests) = 'array'),
 updated_at timestamptz not null default now()
);
alter table public.quest_adventure_preferences enable row level security;
revoke all on public.quest_adventure_preferences from anon;
grant select, insert, update, delete on public.quest_adventure_preferences to authenticated;
create policy "read own adventure preferences" on public.quest_adventure_preferences for select to authenticated using (account_id = (select auth.uid()));
create policy "insert own adventure preferences" on public.quest_adventure_preferences for insert to authenticated with check (account_id = (select auth.uid()));
create policy "update own adventure preferences" on public.quest_adventure_preferences for update to authenticated using (account_id = (select auth.uid())) with check (account_id = (select auth.uid()));
create policy "delete own adventure preferences" on public.quest_adventure_preferences for delete to authenticated using (account_id = (select auth.uid()));
-- Future write API must enforce optimistic concurrency and validate boundary schema.
-- Other participants' preferences must never be queried by client identity alone.
