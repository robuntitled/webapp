import { describe, expect, it } from 'vitest';
import {
  findTextBlockReason,
  textLooksUnsafe,
} from '@/lib/moderation/text-filter';

describe('textLooksUnsafe', () => {
  it('allows normal travel posts', () => {
    expect(textLooksUnsafe('Bello viaggio a Roma con gli amici')).toBe(false);
    expect(textLooksUnsafe('Same-sex couple exploring Tokyo')).toBe(false);
    expect(textLooksUnsafe('Cono gelato a Firenze')).toBe(false);
    expect(textLooksUnsafe('Partenza dal 10/08/2026 al 25/08/2026')).toBe(
      false
    );
    expect(textLooksUnsafe('Budget circa 1200 euro a testa')).toBe(false);
  });

  it('blocks Italian insults', () => {
    expect(textLooksUnsafe('sei un coglione')).toBe(true);
    expect(textLooksUnsafe('figlio di puttana')).toBe(true);
    expect(textLooksUnsafe('vaffanculo a tutti')).toBe(true);
  });

  it('blocks English insults and variants', () => {
    expect(textLooksUnsafe('you fucking idiot')).toBe(true);
    expect(textLooksUnsafe('fuuuuck you')).toBe(true);
    expect(textLooksUnsafe('kill yourself')).toBe(true);
  });

  it('blocks other latin languages', () => {
    expect(textLooksUnsafe('qué cabron')).toBe(true);
    expect(textLooksUnsafe('fils de pute')).toBe(true);
    expect(textLooksUnsafe('du hurensohn')).toBe(true);
    expect(textLooksUnsafe('vai se foder')).toBe(true);
    expect(textLooksUnsafe('co za kurwa')).toBe(true);
  });

  it('blocks non-latin scripts', () => {
    expect(textLooksUnsafe('ты сука')).toBe(true);
    expect(textLooksUnsafe('это пизда')).toBe(true);
  });

  it('blocks links, emails, phones and off-platform contact', () => {
    expect(findTextBlockReason('Guarda https://example.com/trip')).toBe('link');
    expect(findTextBlockReason('sito www.example.it')).toBe('link');
    expect(findTextBlockReason('trovaci su example.com')).toBe('link');
    expect(findTextBlockReason('scrivimi a test@email.com')).toBe('email');
    expect(findTextBlockReason('mail: mario at gmail dot com')).toBe('email');
    expect(findTextBlockReason('WhatsApp +39 333 1234567')).toBe('off_platform');
    expect(findTextBlockReason('Il mio numero è 3331234567')).toBe('phone');
    expect(findTextBlockReason('Contattami su telegram')).toBe('off_platform');
  });

  it('allows NomadLink links', () => {
    expect(
      textLooksUnsafe('Unisciti su https://nomadlink.app/viaggi/123')
    ).toBe(false);
  });

  it('blocks competitor mentions', () => {
    expect(findTextBlockReason('Meglio di Zonzers')).toBe('competitor');
    expect(findTextBlockReason('ci vediamo su Couchsurfing')).toBe(
      'competitor'
    );
    expect(findTextBlockReason('guarda su Nomad List')).toBe('competitor');
  });

  it('blocks obfuscated phones, emails and insults', () => {
    expect(
      findTextBlockReason(
        'tre nove tre tre sei due due sette cinque otto'
      )
    ).toBe('phone');
    expect(findTextBlockReason('3 3 3 1 2 3 4 5 6 7')).toBe('phone');
    expect(
      findTextBlockReason('three three three one two three four five six seven')
    ).toBe('phone');
    expect(findTextBlockReason('mario chiocciola gmail punto com')).toBe(
      'email'
    );
    expect(findTextBlockReason('sito example punto com')).toBe('link');
    expect(findTextBlockReason('c a z z o')).toBe('profanity');
    expect(findTextBlockReason('str0nzo')).toBe('profanity');
  });
});
