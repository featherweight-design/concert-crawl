import { describe, expect, it } from 'vitest';
import { STARTUP_SIZES, startupSizeKey } from '@/lib/pwa/startup-images';
import { GET } from './route';

const call = (size: string) =>
  GET(new Request(`http://localhost/api/pwa/startup/${size}`), {
    params: Promise.resolve({ size }),
  });

describe('GET /api/pwa/startup/[size]', () => {
  it('404s an unknown size', async () => {
    const response = await call('1x1');
    expect(response.status).toBe(404);
  });

  it('serves a PNG with the icon cache headers for a known size', async () => {
    const [first] = STARTUP_SIZES;
    if (first === undefined) throw new Error('no startup sizes');
    const response = await call(startupSizeKey(first));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('image/png');
    expect(response.headers.get('cache-control')).toContain('max-age');
  });
});
