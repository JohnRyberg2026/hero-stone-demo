-- psql -v ON_ERROR_STOP=1 -f database/shared-date-account-rollback-test.sql "$TEST_DATABASE_URL"
-- A disposable/staging Supabase database is preferred. Keep ROLLBACK.
begin;
set local statement_timeout='20s';
\ir shared-date-server.sql
\ir multiple-dating-connections.sql
\ir shared-date-candidates.sql
\ir multiple-dating-connections-test.sql
\ir shared-date-candidates-test.sql
rollback;
select to_regnamespace('hs_shared_dates') is null as test_schema_removed,
 to_regclass('public.one_active_heart_stone_per_user') is not null as original_index_restored;
