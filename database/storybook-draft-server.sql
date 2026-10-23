-- Review candidate only. Apply through the recorded migration workflow after review.
-- Private text-only annual drafts; no sharing, media, deletion or Time Capsules.
create schema hs_storybook;
revoke all on schema hs_storybook from public;
grant usage on schema hs_storybook to authenticated;
create table hs_storybook.drafts (
 owner uuid not null references auth.users(id),
 book_id text not null check(length(book_id) between 1 and 100),
 book jsonb not null,
 storage_revision bigint not null default 0 check(storage_revision between 0 and 9007199254740991),
 primary key(owner,book_id)
);
alter table hs_storybook.drafts enable row level security;
grant select,insert,update on hs_storybook.drafts to authenticated;
create policy own_read on hs_storybook.drafts for select to authenticated using(owner=(select auth.uid()));
create policy own_insert on hs_storybook.drafts for insert to authenticated with check(owner=(select auth.uid()));
create policy own_update on hs_storybook.drafts for update to authenticated using(owner=(select auth.uid())) with check(owner=(select auth.uid()));

create function hs_storybook.validate_book(b jsonb, actor uuid, id text) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare m jsonb; happened date; seen text[]:='{}';
begin
 if jsonb_typeof(b) is distinct from 'object' or not b ?& array['id','owner','year','title','visibility','revision','moments']
 or b-array['id','owner','year','title','visibility','revision','moments'] <> '{}'::jsonb
 or b->>'id' is distinct from id or b->>'owner' is distinct from actor::text or b->>'visibility' is distinct from 'private'
 or jsonb_typeof(b->'title') is distinct from 'string' or length(b->>'title')>120 or length(btrim(b->>'title'))=0
 or jsonb_typeof(b->'year') is distinct from 'number' or (b->>'year')::numeric not between 1900 and 9999 or (b->>'year')::numeric<>trunc((b->>'year')::numeric)
 or jsonb_typeof(b->'revision') is distinct from 'number' or (b->>'revision')::numeric not between 0 and 9007199254740991 or (b->>'revision')::numeric<>trunc((b->>'revision')::numeric)
 or jsonb_typeof(b->'moments') is distinct from 'array' or jsonb_array_length(b->'moments')>500 then return false; end if;
 for m in select value from jsonb_array_elements(b->'moments') loop
  if jsonb_typeof(m) is distinct from 'object' or not m ?& array['id','happenedOn','month','text','author','source','revision']
  or m-array['id','happenedOn','month','text','author','source','revision'] <> '{}'::jsonb
  or jsonb_typeof(m->'id') is distinct from 'string' or length(m->>'id') not between 1 and 100 or length(btrim(m->>'id'))=0 or m->>'id'=any(seen)
  or m->>'author' is distinct from actor::text or m->>'source' is distinct from 'user'
  or jsonb_typeof(m->'text') is distinct from 'string' or length(m->>'text')>10000 or length(btrim(m->>'text'))=0
  or jsonb_typeof(m->'happenedOn') is distinct from 'string' or m->>'happenedOn' !~ '^\d{4}-\d{2}-\d{2}$'
  or jsonb_typeof(m->'month') is distinct from 'number'
  or jsonb_typeof(m->'revision') is distinct from 'number' or (m->>'revision')::numeric not between 0 and 9007199254740991 or (m->>'revision')::numeric<>trunc((m->>'revision')::numeric) then return false; end if;
  happened:=(m->>'happenedOn')::date;
  if to_char(happened,'YYYY-MM-DD')<>m->>'happenedOn' or extract(year from happened)<>(b->>'year')::numeric or extract(month from happened)<>(m->>'month')::numeric then return false; end if;
  seen:=array_append(seen,m->>'id');
 end loop;
 return true;
exception when others then return false;
end $$;
revoke all on function hs_storybook.validate_book(jsonb,uuid,text) from public;
grant execute on function hs_storybook.validate_book(jsonb,uuid,text) to authenticated;
alter table hs_storybook.drafts add constraint valid_private_book check(hs_storybook.validate_book(book,owner,book_id));

-- Enforce revisions even on direct SQL writes; browser identity is never authority.
create function hs_storybook.guard_update() returns trigger language plpgsql security invoker set search_path='' as $$
declare prior jsonb; next_m jsonb;
begin
 if new.owner<>old.owner or new.book_id<>old.book_id or new.book->'year'<>old.book->'year'
 or new.storage_revision<>old.storage_revision+1 or (new.book->>'revision')::numeric<=(old.book->>'revision')::numeric then raise exception 'Draft revision conflict' using errcode='40001'; end if;
 for prior in select value from jsonb_array_elements(old.book->'moments') loop
  select value into next_m from jsonb_array_elements(new.book->'moments') where value->>'id'=prior->>'id';
  if next_m is null or next_m->'happenedOn'<>prior->'happenedOn' then raise exception 'Original moments must be retained' using errcode='22023'; end if;
  if next_m<>prior and (next_m->>'revision')::numeric<=(prior->>'revision')::numeric then raise exception 'Moment revision conflict' using errcode='40001'; end if;
 end loop;
 return new;
end $$;
revoke all on function hs_storybook.guard_update() from public;
create trigger guard_update before update on hs_storybook.drafts for each row execute function hs_storybook.guard_update();

create function public.storybook_draft_action(p_operation text,p_expected_user uuid,p_book_id text,p_expected_revision bigint default null,p_book jsonb default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare actor uuid:=auth.uid(); row hs_storybook.drafts%rowtype;
begin
 if actor is null or actor is distinct from p_expected_user then raise exception 'Sign in with the expected account' using errcode='42501'; end if;
 if p_operation not in ('read','create','save') or p_operation is null or p_book_id is null or length(btrim(p_book_id))=0 or length(p_book_id)>100 then raise exception 'Invalid draft request' using errcode='22023'; end if;
 if p_operation<>'read' and not hs_storybook.validate_book(p_book,actor,p_book_id) then raise exception 'Invalid private draft' using errcode='22023'; end if;
 if p_operation='create' then
  insert into hs_storybook.drafts(owner,book_id,book) values(actor,p_book_id,p_book) on conflict do nothing;
 end if;
 select * into row from hs_storybook.drafts where owner=actor and book_id=p_book_id for update;
 if not found then raise exception 'Draft unavailable' using errcode='42501'; end if;
 if p_operation='create' and row.book<>p_book then raise exception 'Draft already exists; reload before editing' using errcode='40001'; end if;
 if p_operation='save' then
  if p_expected_revision is null or p_expected_revision<0 then raise exception 'Expected revision required' using errcode='22023'; end if;
  -- A retry of the same committed payload returns its existing revision.
  if row.storage_revision=p_expected_revision+1 and row.book=p_book then null;
  elsif row.storage_revision<>p_expected_revision then raise exception 'Draft revision conflict' using errcode='40001';
  elsif row.book<>p_book then
   update hs_storybook.drafts set book=p_book,storage_revision=storage_revision+1 where owner=actor and book_id=p_book_id returning * into row;
  end if;
 end if;
 return jsonb_build_object('book',row.book,'storageRevision',row.storage_revision);
end $$;
revoke all on function public.storybook_draft_action(text,uuid,text,bigint,jsonb) from public,anon;
grant execute on function public.storybook_draft_action(text,uuid,text,bigint,jsonb) to authenticated;
