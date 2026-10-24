-- Read-only catalog report. Reads no account/book/memory rows and installs nothing.
-- Presence checks are prerequisites only, never authorization to install/release.
with required_columns(relation_name,column_name) as (values
 ('profiles','id'),('profiles','account_status'),('profiles','first_name'),
 ('heart_stones','id'),('heart_stones','display_name'),
 ('heart_stone_memberships','heart_stone_id'),('heart_stone_memberships','user_id'),('heart_stone_memberships','status'),
 ('storybook_volumes','id'),('storybook_volumes','heart_stone_id'),('storybook_volumes','title'),('storybook_volumes','volume_year'),('storybook_volumes','state'),
 ('storybook_entries','id'),('storybook_entries','volume_id'),('storybook_entries','story_seed_id'),
 ('story_seeds','id'),('story_seeds','heart_stone_id')
), columns_report as (
 select r.relation_name,r.column_name,a.attname is not null as present,
 case when a.attname is not null then pg_catalog.format_type(a.atttypid,a.atttypmod) end as observed_type
 from required_columns r left join pg_catalog.pg_attribute a
 on a.attrelid=pg_catalog.to_regclass('public.'||r.relation_name) and a.attname=r.column_name and a.attnum>0 and not a.attisdropped
), tables_report as (
 select c.relname as relation_name,c.relrowsecurity as rls_enabled,
 (select count(*) from pg_catalog.pg_trigger t where t.tgrelid=c.oid and not t.tgisinternal and t.tgenabled<>'D') as enabled_trigger_count
 from pg_catalog.pg_class c join pg_catalog.pg_namespace n on n.oid=c.relnamespace
 where n.nspname='public' and c.relname in ('storybook_volumes','storybook_entries','story_seeds','heart_stone_memberships','profiles')
)
select jsonb_build_object(
 'reportScope','catalog prerequisites only; full baseline and behavioral staging validation required',
 'databaseMajor',current_setting('server_version_num')::integer/10000,
 'allRequiredColumnsPresent',(select bool_and(present) from columns_report),
 'columns',(select jsonb_agg(to_jsonb(r) order by relation_name,column_name) from columns_report r),
 'tables',(select jsonb_agg(to_jsonb(t) order by relation_name) from tables_report t),
 'candidateSchemasPresent',jsonb_build_object('personal',to_regnamespace('hs_storybook') is not null,'relationshipReader',to_regnamespace('hs_storybook_bridge') is not null,'consentLedger',to_regnamespace('hs_storybook_consent') is not null),
 'installationAuthorized',false,'releaseReady',false
) as storybook_preflight;
