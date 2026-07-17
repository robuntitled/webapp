const AUTH_ERROR_MESSAGES: Record<string, string> = {
  AccessDenied:
    'Accesso negato. Riprova o usa un altro metodo di registrazione.',
  Configuration:
    'Configurazione OAuth non valida. Per Facebook: in Meta Developers abilita i permessi email e public_profile nel Use case «Authentication», e verifica Valid OAuth Redirect URIs. Per Google/secret: controlla /api/auth/status',
  OAuthAccountNotLinked:
    'Questa email è già registrata con un altro metodo. Accedi con email e password.',
  OAuthSignin:
    'Errore durante il collegamento al provider. Riprova tra poco.',
  OAuthCallback:
    'Errore nel ritorno dal provider. Verifica che il dominio sia configurato correttamente.',
  Default:
    'Accesso non riuscito. Riprova o registrati con email.',
};

export function mapAuthError(code: string | null | undefined): string {
  if (!code) return AUTH_ERROR_MESSAGES.Default;
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_MESSAGES.Default;
}