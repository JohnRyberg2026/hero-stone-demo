-- psql -v ON_ERROR_STOP=1 -f database/shared-date-server-rollback-test.sql "$TEST_DATABASE_URL"
-- Use a disposable/staging Supabase database. Never remove the rollback.
begin;
set local statement_timeout='20s';
\ir shared-date-server.sql
\ir shared-date-server-test.sql
rollback;
select to_regnamespace('hs_shared_dates') is null as test_schema_removed;
