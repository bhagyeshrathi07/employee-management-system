-- =================================================================================================
-- Creates the PostgreSQL database used by the backend (manual / non-Docker setup).
--
--   psql -U postgres -f db/create-database.sql
--
-- Safe to run more than once: the database is only created if it does not already exist.
-- The table schema itself is NOT created here - Flyway applies
-- backend/src/main/resources/db/migration/V1__create_employees_table.sql on first start-up,
-- and the application seeds 25 sample employees when the table is empty.
-- =================================================================================================

SELECT 'CREATE DATABASE employeedb'
WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'employeedb')\gexec
