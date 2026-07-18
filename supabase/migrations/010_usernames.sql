-- Username univoco per ogni utente (handle pubblico).
-- Applica: npm run db:usernames

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS username text;

-- Rimuovi vincoli/indici vecchi se un tentativo precedente è fallito a metà
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_username_key;
DROP INDEX IF EXISTS users_username_unique_idx;
DROP INDEX IF EXISTS users_username_key;

-- Backfill grezzo da nome o email
UPDATE users
SET username = lower(
  regexp_replace(
    regexp_replace(
      trim(both '_' from coalesce(
        nullif(trim(both '_' from regexp_replace(
          coalesce(first_name, '') || '_' || coalesce(last_name, ''),
          '[^a-zA-Z0-9_]+', '_', 'g'
        )), ''),
        nullif(trim(both '_' from regexp_replace(
          split_part(email, '@', 1),
          '[^a-zA-Z0-9_]+', '_', 'g'
        )), ''),
        'nomad'
      )),
      '_+', '_', 'g'
    ),
    '[^a-z0-9_]', '', 'g'
  )
)
WHERE username IS NULL OR btrim(username) = '';

UPDATE users
SET username = left(username, 24)
WHERE length(username) > 24;

UPDATE users
SET username = 'nomad'
WHERE username IS NULL OR length(username) < 3;

-- Rendi unici: per ogni username duplicato, suffix con pezzo di uuid
WITH ranked AS (
  SELECT
    id,
    username,
    row_number() OVER (
      PARTITION BY lower(username)
      ORDER BY coalesce("createdAt", now()), id
    ) AS rn
  FROM users
)
UPDATE users u
SET username = left(r.username, 16) || '_' || substr(replace(u.id::text, '-', ''), 1, 6)
FROM ranked r
WHERE u.id = r.id AND r.rn > 1;

-- Se ancora collisione (estremamente raro), forza id-based
WITH still_dup AS (
  SELECT id,
    row_number() OVER (PARTITION BY lower(username) ORDER BY id) AS rn
  FROM users
)
UPDATE users u
SET username = 'u_' || substr(replace(u.id::text, '-', ''), 1, 12)
FROM still_dup d
WHERE u.id = d.id AND d.rn > 1;

-- Indice univoco case-insensitive
CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique_idx
  ON users (lower(username));

ALTER TABLE users
  ALTER COLUMN username SET NOT NULL;

-- Vista pubblica con username
CREATE OR REPLACE VIEW public_trip_creators AS
  SELECT id, first_name, last_name, username, image FROM users;

REVOKE ALL ON public_trip_creators FROM PUBLIC;
GRANT SELECT ON public_trip_creators TO anon, authenticated;
