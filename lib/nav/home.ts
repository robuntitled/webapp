/**
 * Home = landing con ingressi Organizza / Gruppi.
 * Logo e «Torna alla home» puntano sempre qui, guest e loggati.
 * L’area personale resta su link dedicati (I miei viaggi / profilo).
 */

export const HOME_HREF = '/' as const;

/** Area personale post-login (non è la home). */
export const USER_AREA_HREF = '/pratiche' as const;

export const USER_AREA_LABEL = 'I miei viaggi' as const;

/** Logo / brand links always land on the public home entrances page. */
export function brandHomeHref(): typeof HOME_HREF {
  return HOME_HREF;
}

/**
 * Paths that, for a logged-in privacy-ok user, should bounce to postLoginPath.
 * Home (`/`) is intentionally excluded so the logo can return to the entrances page.
 */
export function loggedInBouncePaths(): readonly string[] {
  return ['/accedi'];
}

export function shouldBounceLoggedInFrom(
  pathname: string,
  opts: { userId: boolean; privacyOk: boolean }
): boolean {
  if (!opts.userId || !opts.privacyOk) return false;
  return loggedInBouncePaths().includes(pathname);
}
