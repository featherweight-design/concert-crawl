import { z } from 'zod';

/**
 * Zod 4 reworded every default validation message ("Required" became "Invalid
 * input: expected string, received undefined", and so on). Some of those
 * messages reach users unchanged: the admin venue form shows the first issue's
 * message, and so does any 400 from a route without its own copy. An upgrade
 * must not change user-visible copy, so this restores Zod 3's wording for the
 * issue kinds the API's schemas produce. A schema's own message always wins:
 * Zod only consults this for issues that carry none.
 *
 * Imported for its side effect by lib/validator.ts (which every validated route
 * imports) and by app.ts.
 */
function joinValues(values: readonly unknown[]): string {
  return values
    .map((value) => (typeof value === 'string' ? `'${value}'` : String(value)))
    .join(' | ');
}

function received(input: unknown): string {
  if (input === null) return 'null';
  if (Array.isArray(input)) return 'array';
  if (typeof input === 'number' && Number.isNaN(input)) return 'nan';
  return typeof input;
}

function zod3Message(issue: z.core.$ZodRawIssue): string | undefined {
  switch (issue.code) {
    case 'invalid_type': {
      if (issue.input === undefined) return 'Required';
      if (issue.expected === 'int') return 'Expected integer, received float';
      return `Expected ${issue.expected}, received ${received(issue.input)}`;
    }
    case 'too_small': {
      const atLeast = issue.inclusive !== false;
      if (issue.origin === 'string') {
        return `String must contain at least ${issue.minimum} character(s)`;
      }
      if (issue.origin === 'array') {
        return `Array must contain at least ${issue.minimum} element(s)`;
      }
      if (issue.origin === 'number' || issue.origin === 'int') {
        return atLeast
          ? `Number must be greater than or equal to ${issue.minimum}`
          : `Number must be greater than ${issue.minimum}`;
      }
      return undefined;
    }
    case 'too_big': {
      const atMost = issue.inclusive !== false;
      if (issue.origin === 'string') {
        return `String must contain at most ${issue.maximum} character(s)`;
      }
      if (issue.origin === 'array') {
        return `Array must contain at most ${issue.maximum} element(s)`;
      }
      if (issue.origin === 'number' || issue.origin === 'int') {
        return atMost
          ? `Number must be less than or equal to ${issue.maximum}`
          : `Number must be less than ${issue.maximum}`;
      }
      return undefined;
    }
    case 'invalid_format': {
      if (issue.format === 'url') return 'Invalid url';
      if (issue.format === 'email') return 'Invalid email';
      if (issue.format === 'guid' || issue.format === 'uuid') {
        return 'Invalid uuid';
      }
      if (issue.format === 'datetime') return 'Invalid datetime';
      if (issue.format === 'regex') return 'Invalid';
      return undefined;
    }
    case 'invalid_value':
      return `Invalid enum value. Expected ${joinValues(issue.values)}, received ${
        typeof issue.input === 'string'
          ? `'${issue.input}'`
          : String(issue.input)
      }`;
    default:
      return undefined;
  }
}

z.config({ customError: zod3Message });
