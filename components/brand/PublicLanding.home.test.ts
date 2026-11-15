import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('PublicLanding home entrances', () => {
  const src = readFileSync(
    new URL('./PublicLanding.tsx', import.meta.url),
    'utf8'
  );

  it('offers Organizza CTA (coral) and Gruppi secondary', () => {
    expect(src).toContain('Organizza il tuo viaggio');
    expect(src).toContain('Vedi le partenze di gruppo');
    expect(src).toContain('home-cta-organizza');
    expect(src).toContain('variant="cta"');
  });

  it('has Come funziona section and no false open-edition counter when empty', () => {
    expect(src).toContain('Tre passi, tu decidi tutto');
    expect(src).toContain('Nessuna partenza aperta ora');
    expect(src).not.toContain('Scopri 1 partenza');
  });

  it('does not promise chat lock phrases without community rules', () => {
    expect(src).not.toContain('Chat di gruppo aperta appena ti iscrivi');
  });

  it('does not use Prenotabile badge', () => {
    expect(src).not.toMatch(/Prenotabile/);
  });
});
