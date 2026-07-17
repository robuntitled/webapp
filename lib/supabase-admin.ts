import 'server-only';
import { createClient } from '@supabase/supabase-js';

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const serviceKey = process.env.SUPABASE_SERVICE_KEY?.trim() ?? '';

  if (!url || !serviceKey) {
    throw new Error(
      'Variabili Supabase mancanti. Imposta NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_KEY in .env.local ' +
        '(Supabase → Project Settings → API). Nota: `vercel env pull` non esporta variabili "sensitive".'
    );
  }

  // Vercel marks production secrets as sensitive; env pull writes the literal placeholder.
  if (url === '[SENSITIVE]' || serviceKey === '[SENSITIVE]') {
    throw new Error(
      'Valori Supabase sono il placeholder [SENSITIVE] da un `vercel env pull` di env sensitive. ' +
        'Copia URL e service_role key da Supabase Dashboard → Project Settings → API in .env.local.'
    );
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url);
  } catch {
    throw new Error(
      `NEXT_PUBLIC_SUPABASE_URL non è un URL valido (valore lunghezza ${url.length}). ` +
        'Atteso qualcosa come https://xxxx.supabase.co'
    );
  }

  return { url, serviceKey };
}

const { url: supabaseUrl, serviceKey: supabaseServiceKey } = requireSupabaseEnv();

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});