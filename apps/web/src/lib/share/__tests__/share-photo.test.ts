import { describe, expect, it, vi } from 'vitest';
import {
  isPublicPhotoUrl,
  loadSharePhoto,
  SHARE_PHOTO_MAX_BYTES,
  sniffImageType,
} from '@/lib/share/share-photo';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const WEBP = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');
const CDN = 'https://i.scdn.co/image/abc';

const fetcherFor = (routes: Record<string, () => Response>) =>
  vi.fn<typeof fetch>(async (input) => {
    const route = routes[String(input)];
    if (route === undefined) throw new Error(`unrouted ${String(input)}`);
    return route();
  });

const redirectTo = (location: string) => () =>
  new Response(null, { status: 302, headers: { location } });

describe('sniffImageType', () => {
  it('reads the formats satori and resvg both draw', () => {
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(
      'image/png',
    );
    expect(sniffImageType(new TextEncoder().encode('GIF89a'))).toBe(
      'image/gif',
    );
  });

  it('refuses anything else, WebP included', () => {
    expect(sniffImageType(WEBP)).toBeNull();
    expect(sniffImageType(new TextEncoder().encode('<html>'))).toBeNull();
  });
});

describe('isPublicPhotoUrl', () => {
  it('allows a normal CDN host', () => {
    expect(isPublicPhotoUrl(CDN)).toBe(true);
    expect(isPublicPhotoUrl('http://venue.example.com/a.jpg')).toBe(true);
  });

  it.each([
    'http://127.0.0.1/a.jpg',
    'http://169.254.169.254/latest/meta-data',
    'http://10.0.0.5/a.jpg',
    'http://2130706433/a.jpg',
    'http://0x7f.1/a.jpg',
    'http://[::1]/a.jpg',
    'http://[fd00::1]/a.jpg',
    'http://localhost/a.jpg',
    'http://localhost./a.jpg',
    'http://localhost../a.jpg',
    'http://printer.local../a.jpg',
    'http://printer.local/a.jpg',
    'http://metadata.google.internal/a.jpg',
    'http://intranet/a.jpg',
    'https://user:pass@cdn.example.com/a.jpg',
    'javascript:alert(1)',
    'ftp://cdn.example.com/a.jpg',
  ])('refuses %s', (url) => {
    expect(isPublicPhotoUrl(url)).toBe(false);
  });
});

describe('loadSharePhoto', () => {
  it('returns a CDN photo as a data URI, fetched without auto-redirects', async () => {
    const fetcher = fetcherFor({ [CDN]: () => new Response(JPEG) });
    expect(await loadSharePhoto([CDN], fetcher)).toMatch(
      /^data:image\/jpeg;base64,/,
    );
    expect(fetcher).toHaveBeenCalledWith(
      CDN,
      expect.objectContaining({ redirect: 'manual' }),
    );
  });

  it('never fetches an IP literal or localhost', async () => {
    const fetcher = fetcherFor({});
    const photo = await loadSharePhoto(
      ['http://127.0.0.1/a.jpg', 'http://localhost/a.jpg'],
      fetcher,
    );
    expect(photo).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('follows a public redirect but refuses one into a private address', async () => {
    const fetcher = fetcherFor({
      'https://a.example.com/x.jpg': redirectTo('http://10.0.0.5/x.jpg'),
      'https://b.example.com/y.jpg': redirectTo('/z.jpg'),
      'https://b.example.com/z.jpg': () => new Response(JPEG),
    });
    expect(
      await loadSharePhoto(['https://a.example.com/x.jpg'], fetcher),
    ).toBeNull();
    expect(fetcher).not.toHaveBeenCalledWith(
      'http://10.0.0.5/x.jpg',
      expect.anything(),
    );
    expect(
      await loadSharePhoto(['https://b.example.com/y.jpg'], fetcher),
    ).toMatch(/^data:image\/jpeg/);
  });

  it('gives up after two redirects', async () => {
    const fetcher = fetcherFor({
      'https://c.example.com/1': redirectTo('https://c.example.com/2'),
      'https://c.example.com/2': redirectTo('https://c.example.com/3'),
      'https://c.example.com/3': redirectTo('https://c.example.com/4'),
      'https://c.example.com/4': () => new Response(JPEG),
    });
    expect(
      await loadSharePhoto(['https://c.example.com/1'], fetcher),
    ).toBeNull();
  });

  it('cancels a body that streams past the cap, whatever its headers say', async () => {
    const cancel = vi.fn();
    const chunk = new Uint8Array(1_000_000);
    chunk.set(JPEG);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(controller) {
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
      cancel,
    });
    const fetcher = fetcherFor({ [CDN]: () => new Response(body) });
    expect(await loadSharePhoto([CDN], fetcher)).toBeNull();
    expect(cancel).toHaveBeenCalled();
    expect(sent).toBeLessThanOrEqual(SHARE_PHOTO_MAX_BYTES + 2 * 1_000_000);
  });

  it('falls through a failing or non-image source to the next', async () => {
    const fetcher = fetcherFor({
      'https://d.example.com/down.jpg': () => new Response('', { status: 503 }),
      'https://d.example.com/page.jpg': () => new Response('<html>'),
      [CDN]: () => new Response(JPEG),
    });
    const photo = await loadSharePhoto(
      [
        'https://d.example.com/down.jpg',
        'https://d.example.com/page.jpg',
        'https://d.example.com/throws.jpg',
        CDN,
      ],
      fetcher,
    );
    expect(photo).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('returns null when nothing loads, so IdentityArt draws', async () => {
    const fetcher = fetcherFor({
      'https://e.example.com/a.webp': () => new Response(WEBP),
    });
    expect(
      await loadSharePhoto(['https://e.example.com/a.webp'], fetcher),
    ).toBeNull();
    expect(await loadSharePhoto([], fetcher)).toBeNull();
  });
});
