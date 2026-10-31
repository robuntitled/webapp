/** Pagine itinerario/pratica: chrome scuro, niente footer marketing. */
export function isComposerPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith('/organizza') || pathname.startsWith('/destinazioni') ||
    pathname.startsWith('/itinerario') ||
    pathname.startsWith('/gruppi') || pathname.startsWith('/partenze') ||
    pathname.startsWith('/pratiche') ||
    pathname.startsWith('/pratica') ||
    pathname.startsWith('/onboarding')
  );
}

