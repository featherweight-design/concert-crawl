import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it, vi, beforeEach } from 'vitest';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public');

// The route fetches its faces from its own origin, which no test has: the
// loader's fetch is what gets stubbed, so the real font parsing still runs.
const realFont = async (assetPath: string): Promise<ArrayBuffer> => {
  const buffer = await readFile(path.join(PUBLIC_DIR, assetPath));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
};

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe('GET /api/og/invite', () => {
  it('answers a session-free crawler with a PNG', async () => {
    mockFetch.mockImplementation(async (input: URL | Request | string) => {
      const url = input instanceof URL ? input.pathname : String(input);
      const data = await realFont(new URL(url, 'http://localhost').pathname);
      return new Response(data, { status: 200 });
    });
    const { GET } = await import('./route');

    const response = await GET(new Request('http://localhost/api/og/invite'));
    const body = Buffer.from(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(body.subarray(0, 4)).toStrictEqual(PNG_MAGIC);
    expect(response.headers.get('cache-control')).toContain('s-maxage');
  });

  it('fails the render when a face will not load', async () => {
    mockFetch.mockResolvedValue(new Response('nope', { status: 404 }));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { GET } = await import('./route');

    const response = await GET(new Request('http://localhost/api/og/invite'));

    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
});
