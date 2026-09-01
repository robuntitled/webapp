/** Pagine itinerario/pratica: chrome scuro, niente footer marketing. */
export function isComposerPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/destinazioni') ||
    pathname.startsWith('/itinerario') ||
    pathname.startsWith('/partenze') ||
    pathname.startsWith('/pratiche') ||
    pathname.startsWith('/pratica') ||
    pathname.startsWith('/onboarding')
  );
}

/** Home catalogo con hero fotografica sotto la navbar. */
export function isHeroCatalogPath(pathname: string | null | undefined): boolean {
  return pathname === '/destinazioni' || pathname === '/partenze';
}
