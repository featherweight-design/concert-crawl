import { describe, expect, it, vi } from 'vitest';
import { loadSharePhoto, sniffImageType } from '@/lib/share/share-photo';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const WEBP = new TextEncoder().encode('RIFF\0\0\0\0WEBPVP8 ');

const fetcherFor = (routes: Record<string, () => Promise<Response>>) =>
  vi.fn<typeof fetch>(async (input) => {
    const route = routes[String(input)];
    if (route === undefined) throw new Error('unrouted');
    return route();
  });

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

describe('loadSharePhoto', () => {
  it('returns the first source as a data URI', async () => {
    const fetcher = fetcherFor({
      'https://img/a.jpg': async () => new Response(JPEG),
    });
    const photo = await loadSharePhoto(['https://img/a.jpg'], fetcher);
    expect(photo).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('falls through a failing, non-image or unsafe source to the next', async () => {
    const fetcher = fetcherFor({
      'https://img/down.jpg': async () => new Response('', { status: 503 }),
      'https://img/page.jpg': async () => new Response('<html>'),
      'https://img/throws.jpg': async () => {
        throw new Error('timeout');
      },
      'https://img/b.jpg': async () => new Response(JPEG),
    });
    const photo = await loadSharePhoto(
      [
        'javascript:alert(1)',
        'https://img/down.jpg',
        'https://img/page.jpg',
        'https://img/throws.jpg',
        'https://img/b.jpg',
      ],
      fetcher,
    );
    expect(photo).toMatch(/^data:image\/jpeg;base64,/);
    expect(fetcher).not.toHaveBeenCalledWith(
      'javascript:alert(1)',
      expect.anything(),
    );
  });

  it('returns null when nothing loads, so IdentityArt draws', async () => {
    const fetcher = fetcherFor({
      'https://img/a.webp': async () => new Response(WEBP),
    });
    expect(await loadSharePhoto(['https://img/a.webp'], fetcher)).toBeNull();
    expect(await loadSharePhoto([], fetcher)).toBeNull();
  });
});
