-- =================================================================================================
-- Drops and recreates the application database (manual / non-Docker setup).
-- WARNING: destroys all employee data. Flyway re-creates the schema and the seeder re-inserts the
-- 25 sample employees the next time the backend starts.
--
--   psql -U postgres -f db/reset-database.sql
-- =================================================================================================

DROP DATABASE IF EXISTS employeedb WITH (FORCE);
CREATE DATABASE employeedb;
