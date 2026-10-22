-- Account-owned wishes plus explicit, revocable snapshots. No intimate categories.
create table public.quest_wishes (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 id text not null check(length(id) between 1 and 160),
 name text not null check(length(trim(name)) between 1 and 120),
 category text not null check(category in ('closet','meals','cafes','stays','indoors','outdoors','romance','transport','destination','experience')),
 url text not null default '' check(url='' or (length(url)<=2000 and url ~ '^https://[^/@[:space:]]+([/?#].*)?$')),
 destination text not null check(destination in ('mine','partner','shared')),
 preference text not null check(preference in ('exact','similar','choose','ask','dream')),
 notes text not null default '' check(length(notes)<=700),
 connection text not null default '' check(length(connection)<=120),
 favorite boolean not null default false,
 revision integer not null default 1 check(revision>0),
 primary key(owner_id,id)
);
alter table public.quest_wishes enable row level security;
revoke all on public.quest_wishes from public,anon;
grant select,insert,update,delete on public.quest_wishes to authenticated;
create policy quest_wishes_owner on public.quest_wishes for all to authenticated
 using(owner_id=(select auth.uid())) with check(owner_id=(select auth.uid()));

create function public.quest_wish_revision() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.owner_id<>old.owner_id or new.id<>old.id then raise exception 'Wish identity cannot change'; end if;
  new.revision:=old.revision+1;
 else new.revision:=1;
 end if;
 return new;
end $$;
revoke all on function public.quest_wish_revision() from public,anon;
create trigger quest_wish_revision before insert or update on public.quest_wishes for each row execute function public.quest_wish_revision();

create table public.quest_wish_shares (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null, wish_id text not null,
 heart_stone_id uuid not null references public.heart_stones(id) on delete cascade,
 recipient_id uuid not null references public.profiles(id) on delete cascade,
 wish_revision integer not null check(wish_revision>0),
 name text not null, category text not null, url text not null, preference text not null,
 shared_note text not null default '' check(length(shared_note)<=700),
 created_at timestamptz not null default now(),
 foreign key(owner_id,wish_id) references public.quest_wishes(owner_id,id) on delete cascade,
 unique(owner_id,wish_id,heart_stone_id,recipient_id),check(owner_id<>recipient_id)
);
create index quest_wish_shares_recipient on public.quest_wish_shares(recipient_id,heart_stone_id);
create index quest_wish_shares_relationship on public.quest_wish_shares(heart_stone_id);
alter table public.quest_wish_shares enable row level security;
revoke all on public.quest_wish_shares from public,anon;
grant select,insert,delete on public.quest_wish_shares to authenticated;
create policy quest_wish_shares_read on public.quest_wish_shares for select to authenticated using (
 owner_id=(select auth.uid()) or (
 recipient_id=(select auth.uid()) and public.is_active_heart_stone_member(heart_stone_id)
 and exists(select 1 from public.heart_stone_memberships m where m.heart_stone_id=quest_wish_shares.heart_stone_id and m.user_id=quest_wish_shares.owner_id and m.status='active')
 and exists(select 1 from public.heart_stones h where h.id=quest_wish_shares.heart_stone_id and h.status='connected')
 ));
create policy quest_wish_shares_insert on public.quest_wish_shares for insert to authenticated with check (
 owner_id=(select auth.uid()) and public.is_active_heart_stone_member(heart_stone_id)
 and exists(select 1 from public.quest_wishes w where w.owner_id=quest_wish_shares.owner_id and w.id=wish_id and w.destination='mine')
 and exists(select 1 from public.heart_stone_memberships m where m.heart_stone_id=quest_wish_shares.heart_stone_id and m.user_id=recipient_id and m.status='active')
 and exists(select 1 from public.heart_stones h where h.id=quest_wish_shares.heart_stone_id and h.status='connected')
 );
create policy quest_wish_shares_delete on public.quest_wish_shares for delete to authenticated using(owner_id=(select auth.uid()));
-- Snapshot only the explicitly shareable fields; private notes/connection/favorite never leave the owner row.
create function public.quest_wish_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
declare w public.quest_wishes;
begin
 select * into w from public.quest_wishes where owner_id=new.owner_id and id=new.wish_id;
 if not found or w.owner_id is distinct from auth.uid() or w.destination<>'mine' then raise exception 'Only your own personal wishes can be shared';end if;
 if new.wish_revision<>w.revision then raise exception 'Wish changed; refresh before sharing';end if;
 new.name:=w.name;new.category:=w.category;new.url:=w.url;new.preference:=w.preference;
 return new;
end $$;
revoke all on function public.quest_wish_snapshot() from public,anon;
create trigger quest_wish_snapshot before insert on public.quest_wish_shares for each row execute function public.quest_wish_snapshot();
