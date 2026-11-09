import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import './zod-messages.js';

// Each expected string is Zod 3.25's default message for the same input,
// which is what users saw before the Zod 4 upgrade.
function firstMessage(schema: z.ZodType, input: unknown): string | undefined {
  const result = schema.safeParse(input);
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('Zod 3 message wording on Zod 4', () => {
  it.each([
    [z.object({ name: z.string() }), {}, 'Required'],
    [z.string(), 5, 'Expected string, received number'],
    [z.number().int(), 1.5, 'Expected integer, received float'],
    [z.string().min(1), '', 'String must contain at least 1 character(s)'],
    [z.string().max(3), 'abcd', 'String must contain at most 3 character(s)'],
    [z.number().min(1000), 5, 'Number must be greater than or equal to 1000'],
    [
      z.number().max(30000),
      40000,
      'Number must be less than or equal to 30000',
    ],
    [z.number().positive(), 0, 'Number must be greater than 0'],
    [
      z.array(z.string()).min(1),
      [],
      'Array must contain at least 1 element(s)',
    ],
    [z.string().url(), 'nope', 'Invalid url'],
    [z.string().email(), 'nope', 'Invalid email'],
    [z.guid(), 'nope', 'Invalid uuid'],
    [z.string().regex(/^a$/), 'b', 'Invalid'],
    [
      z.enum(['GA', 'VIP']),
      'Pit',
      "Invalid enum value. Expected 'GA' | 'VIP', received 'Pit'",
    ],
  ] as const)('%#: keeps Zod 3 text', (schema, input, expected) => {
    expect(firstMessage(schema, input)).toBe(expected);
  });

  it('leaves a schema’s own message alone', () => {
    expect(firstMessage(z.string().min(2, 'too short'), 'a')).toBe('too short');
  });
});
