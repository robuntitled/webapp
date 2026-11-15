import { describe, expect, it } from 'vitest';
import { HOME_HREF, MOBILE_TAB_NAV, PRIMARY_NAV, USER_AREA_HREF } from '@/lib/brand/nav';

describe('PRIMARY_NAV', () => {
  it('espone Esplora, Organizza, Gruppi e Viaggi (auth)', () => {
    expect(PRIMARY_NAV.map((i) => i.label)).toEqual([
      'Esplora',
      'Organizza',
      'Gruppi',
      'Viaggi',
    ]);
    expect(PRIMARY_NAV.map((i) => i.href)).toEqual([
      '/',
      '/organizza',
      '/gruppi',
      '/pratiche',
    ]);
    const mine = PRIMARY_NAV.find((i) => i.href === '/pratiche');
    expect(mine && 'auth' in mine && mine.auth).toBe(true);
  });

  it('keeps home and user area distinct', () => {
    expect(HOME_HREF).toBe('/');
    expect(USER_AREA_HREF).toBe('/pratiche');
    expect(HOME_HREF).not.toBe(USER_AREA_HREF);
  });

  it('match pathname coerenti', () => {
    const org = PRIMARY_NAV.find((i) => i.href === '/organizza')!;
    expect(org.match('/organizza')).toBe(true);
    expect(org.match('/itinerario/x')).toBe(true);
    expect(org.match('/gruppi')).toBe(false);

    const groups = PRIMARY_NAV.find((i) => i.href === '/gruppi')!;
    expect(groups.match('/gruppi')).toBe(true);
    expect(groups.match('/partenze/1')).toBe(true);
  });
});

describe('MOBILE_TAB_NAV', () => {
  it('ha 5 tab Esplora→Profilo', () => {
    expect(MOBILE_TAB_NAV.map((t) => t.label)).toEqual([
      'Esplora',
      'Organizza',
      'Gruppi',
      'Viaggi',
      'Profilo',
    ]);
  });
});
