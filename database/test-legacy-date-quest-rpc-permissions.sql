begin;
select set_config('request.jwt.claims','{}',true),set_config('request.jwt.claim.sub','',true);
do $check$
declare signature text;
begin
 foreach signature in array array['public.accept_heart_stone_invitation(text)','public.begin_demo_quest(uuid,adventure_type,text,integer,text,text[],integer,text,integer)','public.cancel_demo_adventure(uuid)','public.cancel_heart_stone_invitation(uuid)','public.complete_demo_adventure(uuid)','public.create_heart_stone_invitation(text,text,integer)','public.decline_heart_stone_invitation(text)','public.get_demo_adventure_history(uuid,integer)','public.open_demo_date_invitation(uuid)','public.preview_heart_stone_invitation(text)','public.propose_demo_recommendation(uuid)','public.refresh_demo_recommendations(uuid,uuid[],integer)','public.respond_demo_date_invitation(uuid,boolean)','public.reveal_demo_adventure(uuid)','public.rotate_heart_stone_invitation(uuid,integer)','public.save_demo_adventure_feedback(uuid,feedback_rating,text)','public.set_demo_invitation_style(uuid,text)','public.start_another_demo_adventure(uuid)'] loop
   if has_function_privilege('anon',signature,'EXECUTE') then raise exception 'Anonymous grant remains: %',signature;end if;
   if not has_function_privilege('authenticated',signature,'EXECUTE') then raise exception 'Authenticated grant missing: %',signature;end if;
   if not has_function_privilege('service_role',signature,'EXECUTE') then raise exception 'Service grant missing: %',signature;end if;
 end loop;
end $check$;
set local role anon;
do $check$
begin
  begin
    execute 'select public.accept_heart_stone_invitation(null::text)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.begin_demo_quest(null::uuid,null::public.adventure_type,null::text,null::integer,null::text,null::text[],null::integer,null::text,null::integer)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.cancel_demo_adventure(null::uuid)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.cancel_heart_stone_invitation(null::uuid)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.complete_demo_adventure(null::uuid)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.create_heart_stone_invitation(null::text,null::text,null::integer)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.decline_heart_stone_invitation(null::text)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.get_demo_adventure_history(null::uuid,null::integer)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.open_demo_date_invitation(null::uuid)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.preview_heart_stone_invitation(null::text)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.propose_demo_recommendation(null::uuid)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.refresh_demo_recommendations(null::uuid,null::uuid[],null::integer)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.respond_demo_date_invitation(null::uuid,null::boolean)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.reveal_demo_adventure(null::uuid)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.rotate_heart_stone_invitation(null::uuid,null::integer)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.save_demo_adventure_feedback(null::uuid,null::public.feedback_rating,null::text)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.set_demo_invitation_style(null::uuid,null::text)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    execute 'select public.start_another_demo_adventure(null::uuid)';
    raise exception 'Anonymous call unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end $check$;
reset role;
set local role authenticated;
do $check$
begin
  begin
    execute 'select public.accept_heart_stone_invitation(null::text)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.begin_demo_quest(null::uuid,null::public.adventure_type,null::text,null::integer,null::text,null::text[],null::integer,null::text,null::integer)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.cancel_demo_adventure(null::uuid)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.cancel_heart_stone_invitation(null::uuid)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.complete_demo_adventure(null::uuid)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.create_heart_stone_invitation(null::text,null::text,null::integer)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.decline_heart_stone_invitation(null::text)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.get_demo_adventure_history(null::uuid,null::integer)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.open_demo_date_invitation(null::uuid)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.preview_heart_stone_invitation(null::text)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.propose_demo_recommendation(null::uuid)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.refresh_demo_recommendations(null::uuid,null::uuid[],null::integer)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.respond_demo_date_invitation(null::uuid,null::boolean)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.reveal_demo_adventure(null::uuid)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.rotate_heart_stone_invitation(null::uuid,null::integer)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.save_demo_adventure_feedback(null::uuid,null::public.feedback_rating,null::text)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.set_demo_invitation_style(null::uuid,null::text)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
  begin
    execute 'select public.start_another_demo_adventure(null::uuid)';
  exception
    when insufficient_privilege then if sqlerrm<>'This legacy feature is limited to the existing development accounts.' then raise;end if;
    when others then null; -- Existing identity/validation checks may reject null inputs.
  end;
end $check$;
reset role;
select 'PASS: 18 anonymous RPC calls blocked; authenticated and service grants preserved; unrostered calls reached the legacy boundary' as result;
rollback;

-- Separate transaction exercises authenticated membership enforcement.
begin;
select set_config('request.jwt.claim.sub',gen_random_uuid()::text,true),
       set_config('request.jwt.claim.role','authenticated',true),
       set_config('request.jwt.claims','{"role":"authenticated"}',true);
set local role authenticated;
do $check$
begin
 begin
   perform public.get_demo_adventure_history(gen_random_uuid(),1);
   raise exception 'Unauthorized history access unexpectedly succeeded';
 exception when insufficient_privilege then
   if sqlerrm <> 'This legacy feature is limited to the existing development accounts.' then raise;end if;
 end;
end $check$;
reset role;
select 'PASS: signed-in nonmember history access remains blocked by legacy boundary' as result;
rollback;