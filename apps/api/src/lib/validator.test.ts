import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { validationHook } from './validator.js';

const schema = z.object({ name: z.string() });

function post(app: Hono, body: unknown) {
  return app.request('/', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const withHook = new Hono().post(
  '/',
  zValidator('json', schema, validationHook),
  (ctx) => ctx.json({ ok: true }),
);

describe('validationHook', () => {
  it('answers a bad body with the issue list the web parses', async () => {
    const res = await post(withHook, {});
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toEqual({
      success: false,
      error: {
        name: 'ZodError',
        issues: [expect.objectContaining({ path: ['name'] })],
      },
    });
  });

  it('lets a valid body through to the handler', async () => {
    const res = await post(withHook, { name: 'Ogden Theatre' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  // On Zod 3 the hook must change nothing: zValidator's own default answer
  // serialises the ZodError to the same body. This case is removed with the
  // Zod 4 upgrade, whose ZodError serialises to { name, message } instead.
  it('matches zValidator’s default 400 body on Zod 3', async () => {
    const withoutHook = new Hono().post(
      '/',
      zValidator('json', schema),
      (ctx) => ctx.json({ ok: true }),
    );
    const expected = await (await post(withoutHook, {})).json();
    expect(await (await post(withHook, {})).json()).toEqual(expected);
  });
});
