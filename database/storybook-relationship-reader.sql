-- Review candidate only. Do not install without baseline/staging review.
-- Summary access only; no content transfer, writes, publication or wider grants.
create schema hs_storybook_bridge;
revoke all on schema hs_storybook_bridge from public,anon,authenticated;
grant usage on schema hs_storybook_bridge to authenticated;
create function hs_storybook_bridge.list_relationship_books(p_expected_user uuid,p_heart_stone_id uuid)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();
begin
 if v_user is null or p_expected_user is distinct from v_user then raise exception 'Sign in with the expected account' using errcode='42501';end if;
 if p_heart_stone_id is null then raise exception 'Choose a relationship' using errcode='22023';end if;
 perform 1 from public.profiles where id=v_user and account_status='active' for share;
 if not found then raise exception 'Active account required' using errcode='42501';end if;
 perform 1 from public.heart_stone_memberships where user_id=v_user and heart_stone_id=p_heart_stone_id and status='active' for share;
 if not found then raise exception 'Relationship unavailable' using errcode='42501';end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'title',v.title,'year',v.volume_year,'state',v.state,'scope','relationship','relationshipId',p_heart_stone_id) order by v.volume_year desc nulls last,v.id) from
  (select id,title,volume_year,state from public.storybook_volumes where heart_stone_id=p_heart_stone_id order by volume_year desc nulls last,id limit 100) v),'[]'::jsonb);
end;$$;
revoke all on function hs_storybook_bridge.list_relationship_books(uuid,uuid) from public,anon;
grant execute on function hs_storybook_bridge.list_relationship_books(uuid,uuid) to authenticated;
create function public.list_my_relationship_storybooks(p_expected_user uuid,p_heart_stone_id uuid)
returns jsonb language sql security invoker set search_path='' as $$select hs_storybook_bridge.list_relationship_books(p_expected_user,p_heart_stone_id);$$;
revoke all on function public.list_my_relationship_storybooks(uuid,uuid) from public,anon;
grant execute on function public.list_my_relationship_storybooks(uuid,uuid) to authenticated;
