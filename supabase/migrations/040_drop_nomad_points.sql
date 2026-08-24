-- 040: remove NomadPoints loyalty program (tables + trip boost columns)

DROP TABLE IF EXISTS nomad_points_ledger CASCADE;
DROP TABLE IF EXISTS founding_creators CASCADE;
DROP TABLE IF EXISTS user_perks CASCADE;
DROP TABLE IF EXISTS automation_sends CASCADE;

DROP INDEX IF EXISTS trips_boost_until_idx;
ALTER TABLE IF EXISTS trips DROP COLUMN IF EXISTS boost_until;
ALTER TABLE IF EXISTS trips DROP COLUMN IF EXISTS boost_source;
