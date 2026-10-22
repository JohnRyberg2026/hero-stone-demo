-- psql -v ON_ERROR_STOP=1 -f database/date-connection-release-rollback-test.sql "$TEST_DATABASE_URL"
-- Use a disposable/staging Supabase database. Never remove ROLLBACK.
begin;
set local lock_timeout='3s';
set local statement_timeout='20s';
\ir shared-date-server.sql
\ir multiple-dating-connections.sql
\ir shared-date-candidates.sql
\ir shared-date-server-test.sql
\ir multiple-dating-connections-test.sql
\ir shared-date-candidates-test.sql
rollback;
select to_regnamespace('hs_shared_dates') is null as test_schema_removed,
 to_regnamespace('hs_connection_internal') is null as connection_test_schema_removed,
 to_regclass('public.one_active_heart_stone_per_user') is not null as original_index_restored;
