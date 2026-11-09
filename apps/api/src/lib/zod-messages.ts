import { z } from 'zod';

/**
 * Zod 4 reworded every default validation message ("Required" became "Invalid
 * input: expected string, received undefined", and so on). Some of those
 * messages reach users unchanged: the admin venue form shows the first issue's
 * message, and so does any 400 from a route without its own copy. An upgrade
 * must not change user-visible copy, so this restores Zod 3's wording for the
 * issue kinds the API's schemas produce, including the cases Zod 4 folded
 * together (a missing or non-string enum value, a literal, an exact length).
 * A schema's own message always wins: Zod only consults this for issues that
 * carry none. Not mapped: a discriminated union with an unknown discriminator,
 * which only internal admin triage rows can produce.
 *
 * `z.config` is process-wide, so this also words issues from the workspace
 * packages' schemas when the API parses them. Imported for its side effect by
 * app.ts (the server) and lib/validator.ts (so route tests that use the hook
 * get it too).
 */
function joinValues(values: readonly unknown[]): string {
  return values
    .map((value) => (typeof value === 'string' ? `'${value}'` : String(value)))
    .join(' | ');
}

function received(input: unknown): string {
  if (input === null) return 'null';
  if (input instanceof Date) return 'date';
  if (Array.isArray(input)) return 'array';
  if (typeof input === 'number' && Number.isNaN(input)) return 'nan';
  return typeof input;
}

function zod3Message(issue: z.core.$ZodRawIssue): string | undefined {
  switch (issue.code) {
    case 'invalid_type': {
      if (issue.input === undefined) return 'Required';
      if (issue.expected === 'int') return 'Expected integer, received float';
      // Zod 3 called these object and array.
      const expected =
        issue.expected === 'record'
          ? 'object'
          : issue.expected === 'tuple'
            ? 'array'
            : issue.expected;
      return `Expected ${expected}, received ${received(issue.input)}`;
    }
    case 'too_small': {
      const atLeast = issue.inclusive !== false;
      const bound = issue.exact ? 'exactly' : 'at least';
      if (issue.origin === 'string') {
        return `String must contain ${bound} ${issue.minimum} character(s)`;
      }
      if (issue.origin === 'array') {
        return `Array must contain ${bound} ${issue.minimum} element(s)`;
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
      const bound = issue.exact ? 'exactly' : 'at most';
      if (issue.origin === 'string') {
        return `String must contain ${bound} ${issue.maximum} character(s)`;
      }
      if (issue.origin === 'array') {
        return `Array must contain ${bound} ${issue.maximum} element(s)`;
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
    case 'invalid_value': {
      if (issue.input === undefined) return 'Required';
      const def = issue.inst?._zod.def;
      if (def && 'type' in def && def.type === 'literal') {
        return `Invalid literal value, expected ${JSON.stringify(issue.values[0])}`;
      }
      // Zod 3 reported a non-string enum input as a type mismatch.
      if (typeof issue.input !== 'string') {
        return `Expected ${joinValues(issue.values)}, received ${received(issue.input)}`;
      }
      return `Invalid enum value. Expected ${joinValues(issue.values)}, received '${issue.input}'`;
    }
    case 'unrecognized_keys':
      return `Unrecognized key(s) in object: ${issue.keys
        .map((key) => `'${key}'`)
        .join(', ')}`;
    default:
      return undefined;
  }
}

z.config({ customError: zod3Message });
