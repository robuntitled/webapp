import { describe, expect, it } from 'vitest';
import { generateMockDayBlocks } from '@/lib/composer/mock-day-generator';

describe('generateMockDayBlocks', () => {
  it('generates rich Marche day for Italian borgo', () => {
    const { blocks } = generateMockDayBlocks({
      destination: 'Monte San Giusto, Marche, Italia',
      destinationMeta: { label: 'Monte San Giusto', countryCode: 'IT' },
      dayIndex: 2,
      totalDays: 7,
      planningMode: 'group',
    });

    const titles = blocks.map((b) => String(b.content.title));
    expect(
      titles.some((t) =>
        /olive|vincisgrassi|borgo|colline|loreto|monte san giusto|maceratese/i.test(t)
      )
    ).toBe(true);
  });

  it('uses Ancona airport for Marche arrival', () => {
    const { blocks } = generateMockDayBlocks({
      destination: 'Monte San Giusto, Marche, Italia',
      destinationMeta: { label: 'Monte San Giusto', countryCode: 'IT' },
      dayIndex: 1,
      totalDays: 5,
      planningMode: 'solo',
    });

    const flight = blocks.find((b) => b.type === 'flight');
    expect(String(flight?.content.destination)).toBe('AOI');
  });

  it('uses organizer origin IATA for outbound flight', () => {
    const { blocks } = generateMockDayBlocks({
      destination: 'Monte San Giusto, Marche, Italia',
      destinationMeta: { label: 'Monte San Giusto', countryCode: 'IT' },
      dayIndex: 1,
      totalDays: 5,
      planningMode: 'solo',
      organizerOrigin: {
        id: 'org1',
        label: 'Monte San Giusto',
        city: 'Monte San Giusto',
        iata: 'AOI',
        role: 'organizer',
      },
    });

    const flight = blocks.find((b) => b.type === 'flight');
    expect(String(flight?.content.origin)).toBe('AOI');
  });

  it('adds crew arrival note in group mode', () => {
    const { blocks } = generateMockDayBlocks({
      destination: 'Monte San Giusto, Marche, Italia',
      destinationMeta: { label: 'Monte San Giusto', countryCode: 'IT' },
      dayIndex: 1,
      totalDays: 5,
      planningMode: 'group',
      organizerOrigin: {
        id: 'org1',
        label: 'Monte San Giusto',
        city: 'Monte San Giusto',
        iata: 'AOI',
        role: 'organizer',
      },
      crewOrigins: [
        {
          id: 'c1',
          label: 'Milano',
          city: 'Milano',
          iata: 'MIL',
          role: 'crew',
        },
      ],
    });

    const note = blocks.find((b) => b.type === 'note');
    expect(String(note?.content.body)).toContain('Milano');
    expect(String(note?.content.body)).toContain('MIL');
  });

  it('generates arrival day for day 1', () => {
    const { suggestedTitle, blocks } = generateMockDayBlocks({
      destination: 'Thailandia',
      dayIndex: 1,
      totalDays: 5,
      planningMode: 'group',
    });

    expect(suggestedTitle).toContain('Arrivo');
    expect(blocks.some((b) => b.type === 'flight')).toBe(true);
    expect(blocks.some((b) => b.type === 'hotel')).toBe(true);
  });

  it('generates departure day for last day', () => {
    const { blocks } = generateMockDayBlocks({
      destination: 'Sicilia',
      dayIndex: 7,
      totalDays: 7,
      planningMode: 'solo',
    });

    expect(blocks.some((b) => b.type === 'flight')).toBe(true);
    expect(blocks.length).toBeLessThanOrEqual(4);
  });

  it('generates exploration for middle days', () => {
    const { blocks } = generateMockDayBlocks({
      destination: 'Bali',
      dayIndex: 3,
      totalDays: 5,
      planningMode: 'group',
    });

    expect(blocks.some((b) => b.type === 'attraction')).toBe(true);
    expect(blocks.some((b) => b.type === 'activity')).toBe(true);
  });
});