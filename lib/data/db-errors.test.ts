import { describe, expect, it } from 'vitest';
import { friendlyDbErrorIt, isMissingSchemaError } from '@/lib/data/db-errors';

describe('db-errors', () => {
  it('detects PostgREST schema-cache missing column (editions.title)', () => {
    expect(
      isMissingSchemaError({
        code: 'PGRST204',
        message: "Could not find the 'title' column of 'editions' in the schema cache",
      })
    ).toBe(true);
  });

  it('never surfaces raw schema-cache text to users', () => {
    const msg = friendlyDbErrorIt({
      code: 'PGRST204',
      message: "Could not find the 'title' column of 'editions' in the schema cache",
    });
    expect(msg).not.toMatch(/schema cache|title|editions/i);
    expect(msg.toLowerCase()).toMatch(/viaggio|riprova/);
  });
});
