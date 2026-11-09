import { describe, expect, it } from 'vitest';
import { HOME_HREF, PRIMARY_NAV, USER_AREA_HREF } from '@/lib/brand/nav';

describe('PRIMARY_NAV', () => {
  it('espone Organizza, Gruppi, Bacheca e I miei viaggi (auth)', () => {
    expect(PRIMARY_NAV.map((i) => i.label)).toEqual([
      'Organizza',
      'Gruppi',
      'Bacheca',
      'I miei viaggi',
    ]);
    expect(PRIMARY_NAV.map((i) => i.href)).toEqual([
      '/organizza',
      '/gruppi',
      '/bacheca',
      '/pratiche',
    ]);
    const mine = PRIMARY_NAV.find((i) => i.href === '/pratiche');
    expect(mine && 'auth' in mine && mine.auth).toBe(true);
    const board = PRIMARY_NAV.find((i) => i.href === '/bacheca');
    expect(board && 'auth' in board && board.auth).toBe(true);
  });

  it('keeps home and user area distinct', () => {
    expect(HOME_HREF).toBe('/');
    expect(USER_AREA_HREF).toBe('/pratiche');
    expect(HOME_HREF).not.toBe(USER_AREA_HREF);
  });

  it('match pathname coerenti', () => {
    const org = PRIMARY_NAV[0];
    expect(org.match('/organizza')).toBe(true);
    expect(org.match('/itinerario/x')).toBe(true);
    expect(org.match('/gruppi')).toBe(false);

    const groups = PRIMARY_NAV[1];
    expect(groups.match('/gruppi')).toBe(true);
    expect(groups.match('/partenze/1')).toBe(true);
  });
});
