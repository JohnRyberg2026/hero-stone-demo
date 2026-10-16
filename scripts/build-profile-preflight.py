from pathlib import Path
import re,hashlib,json
root=Path('.')
baseline=(root/'tests/fixtures/demo-rpc-baseline.sql').read_text()
sigs={
'begin_demo_quest':'uuid,public.adventure_type,text,integer,text,text[],integer,text,integer',
'propose_demo_recommendation':'uuid','refresh_demo_recommendations':'uuid,uuid[],integer',
'respond_demo_date_invitation':'uuid,boolean','reveal_demo_adventure':'uuid','set_demo_invitation_style':'uuid,text'}
rows=[]
for m in re.finditer(r'CREATE OR REPLACE FUNCTION public\.(\w+)\([\s\S]*?\$function\$;',baseline):
 name=m.group(1);normalized=re.sub(r'[\s;]+$','',m.group(0).replace('\r\n','\n'));digest=hashlib.md5(normalized.encode()).hexdigest();rows.append("('public.%s(%s)','%s')"%(name,sigs[name],digest))
assert len(rows)==6
cols=[('profiles','id'),('heart_stones','id'),('heart_stone_memberships','heart_stone_id'),('heart_stone_memberships','user_id'),('heart_stone_memberships','status'),('user_onboarding_answers','user_id'),('user_onboarding_answers','question_key'),('user_onboarding_answers','answer_json'),('user_onboarding_answers','skipped'),('recommendation_requests','created_by_user_id'),('recommendations','request_id'),('recommendations','heart_stone_id'),('adventures','source_recommendation_id'),('adventures','created_by_user_id'),('adventures','is_demo'),('adventures','invitation_style'),('adventures','adventure_revealed_at'),('adventure_steps','adventure_id')]
sql="""-- READ ONLY: metadata comparison with the inspected October 16 baseline.
-- No user rows are read; no DDL or mutations are executed. This never certifies deployment readiness.
with expected_functions(signature,expected_md5) as (values
"""+',\n'.join(rows)+"""
), function_checks as (
 select e.signature,
   coalesce(md5(regexp_replace(replace(pg_get_functiondef(p.oid),E'\\r\\n',E'\\n'),'[[:space:];]+$','','g'))=e.expected_md5,false) as baseline_matches
 from expected_functions e left join pg_proc p on p.oid=to_regprocedure(e.signature)
), expected_columns(table_name,column_name) as (values
"""+',\n'.join("('%s','%s')"%c for c in cols)+"""
), column_checks as (
 select e.table_name,e.column_name,exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name=e.table_name and c.column_name=e.column_name) as present
 from expected_columns e
), expected_rls(table_name) as (values ('user_onboarding_answers'),('recommendation_requests'),('recommendations'),('adventures'),('adventure_steps')),
rls_checks as (
 select e.table_name,coalesce(c.relrowsecurity,false) as enabled from expected_rls e
 left join pg_namespace n on n.nspname='public' left join pg_class c on c.relnamespace=n.oid and c.relname=e.table_name
)
select jsonb_build_object(
 'check_type','read_only_baseline_preflight',
 'deployment_ready',false,
 'baseline_functions_match',(select bool_and(baseline_matches) from function_checks),
 'functions',(select jsonb_agg(to_jsonb(f) order by signature) from function_checks f),
 'required_columns_present',(select bool_and(present) from column_checks),
 'missing_columns',coalesce((select jsonb_agg(to_jsonb(c) order by table_name,column_name) from column_checks c where not present),'[]'::jsonb),
 'rls_enabled',(select bool_and(enabled) from rls_checks),
 'rls',(select jsonb_agg(to_jsonb(r) order by table_name) from rls_checks r),
 'guard_helper_present',to_regprocedure('heartstone_private.require_demo_profile_requirements(uuid)') is not null,
 'remaining_gates',jsonb_build_array('staging and actual schema/role verification','envelope column masking','independent-session contention and timeout tests','real-account two-device checks','reviewed deployment and rollback')
) as preflight;
"""
(root/'database/profile_guard_preflight.sql').write_text(sql)
p=root/'database/profile_guard_bundle.json';j=json.loads(p.read_text());j['read_only_preflight']='profile_guard_preflight.sql';p.write_text(json.dumps(j,indent=2)+'\n')
