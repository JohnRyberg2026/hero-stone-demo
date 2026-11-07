-- Read-only grant verification; never executes TRUNCATE or any data modification.
do $check$
declare r record;role_name text;privilege_name text;
begin
 for r in select c.oid,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in('r','p') loop
  foreach role_name in array array['anon','authenticated'] loop
   foreach privilege_name in array array['TRUNCATE','REFERENCES','TRIGGER','MAINTAIN'] loop
    if has_table_privilege(role_name,r.oid,privilege_name) then raise exception 'Unexpected client maintenance privilege: % % %',role_name,r.relname,privilege_name;end if;
   end loop;
  end loop;
 end loop;
 if exists(
  select 1 from pg_default_acl d join pg_namespace n on n.oid=d.defaclnamespace cross join lateral aclexplode(d.defaclacl) acl
  where d.defaclrole='postgres'::regrole and n.nspname='public' and d.defaclobjtype='r'
  and (acl.grantee=0 or acl.grantee in('anon'::regrole,'authenticated'::regrole))
  and acl.privilege_type in('TRUNCATE','REFERENCES','TRIGGER','MAINTAIN')
 ) then raise exception 'Application migration defaults still grant maintenance powers';end if;
end $check$;
select 'PASS: all public application base-table client maintenance grants absent; postgres public-table defaults restricted. No data modified.' as result;
