-- Postgres 15+ no longer grants CREATE on the "public" schema to the database
-- owner by default. Make sure the app user can create/use objects there, and
-- that future tables/sequences created by other roles (e.g. migrations run as
-- a different user) stay accessible.
GRANT ALL ON SCHEMA public TO support;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO support;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO support;
