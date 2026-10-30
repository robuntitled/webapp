-- READ-ONLY audit: pratiche "private" (mode friends/group) agganciate a edition
-- create da un altro utente. NON esegue UPDATE/DELETE.
-- Uso: eseguire manualmente in SQL editor Supabase (preview/prod a scelta del proprietario).
--
-- Criterio: practice.user_id <> editions.created_by
--           AND editions.edition_type = 'private'
--           AND practice.mode IN ('friends', 'group')
--           AND practice.status <> 'cancelled'
--           AND practice.edition_id IS NOT NULL

-- Dettaglio righe da rivedere
SELECT
  p.id AS practice_id,
  p.user_id AS practice_owner_id,
  p.template_id,
  p.mode,
  p.status AS practice_status,
  p.date_from AS practice_date_from,
  p.date_to AS practice_date_to,
  p.edition_id,
  e.edition_type,
  e.created_by AS edition_creator_id,
  e.date_from AS edition_date_from,
  e.date_to AS edition_date_to,
  e.status AS edition_status,
  e.invite_token IS NOT NULL AS has_invite_token,
  EXISTS (
    SELECT 1
    FROM edition_members em
    WHERE em.edition_id = e.id
      AND em.user_id = p.user_id
      AND em.status IN ('interested', 'confirmed')
  ) AS practice_owner_is_edition_member
FROM practices p
JOIN editions e ON e.id = p.edition_id
WHERE p.edition_id IS NOT NULL
  AND p.status <> 'cancelled'
  AND p.mode IN ('friends', 'group')
  AND e.edition_type = 'private'
  AND e.created_by IS NOT NULL
  AND e.created_by <> p.user_id
ORDER BY p.created_at DESC NULLS LAST;

-- Conteggio
SELECT COUNT(*) AS foreign_private_practice_rows
FROM practices p
JOIN editions e ON e.id = p.edition_id
WHERE p.edition_id IS NOT NULL
  AND p.status <> 'cancelled'
  AND p.mode IN ('friends', 'group')
  AND e.edition_type = 'private'
  AND e.created_by IS NOT NULL
  AND e.created_by <> p.user_id;
