/**
 * Regole privacy edition private (senza I/O).
 * Un viaggio privato non riusa mai l’edition di un altro utente.
 */

export type PrivateEditionReuseCandidate = {
  edition_type: string;
  created_by?: string | null;
};

/**
 * Si può riusare un’edition già agganciata a una bozza solo se è privata
 * e creata dall’utente corrente. Mai match su destinazione/date di terzi.
 */
export function canReusePrivateEditionForUser(
  edition: PrivateEditionReuseCandidate | null | undefined,
  userId: string
): boolean {
  if (!edition || !userId) return false;
  if (edition.edition_type !== 'private') return false;
  if (!edition.created_by) return false;
  return edition.created_by === userId;
}

/**
 * Due create private con stessa destinazione/date devono produrre edition id distinti.
 * Helper per test: simula l’esito di due create senza riuso cross-user.
 */
export function privateCreatesMustYieldDistinctEditions(input: {
  userA: string;
  userB: string;
  /** Edition che la bozza di A punta oggi (se esiste). */
  draftEditionForA?: PrivateEditionReuseCandidate & { id: string };
  /** Edition che la bozza di B punta oggi (se esiste). */
  draftEditionForB?: PrivateEditionReuseCandidate & { id: string };
}): { reuseA: boolean; reuseB: boolean; mustCreateNewForA: boolean; mustCreateNewForB: boolean } {
  const reuseA = canReusePrivateEditionForUser(input.draftEditionForA, input.userA);
  const reuseB = canReusePrivateEditionForUser(input.draftEditionForB, input.userB);
  return {
    reuseA,
    reuseB,
    mustCreateNewForA: !reuseA,
    mustCreateNewForB: !reuseB,
  };
}
