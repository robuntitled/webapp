/** Path profilo pubblico — safe per client e server. */
export function profilePath(
  username: string | null | undefined,
  userId?: string | null
): string | null {
  if (username?.trim()) {
    return `/u/${encodeURIComponent(username.trim().toLowerCase())}`;
  }
  if (userId) return `/u/id/${userId}`;
  return null;
}
