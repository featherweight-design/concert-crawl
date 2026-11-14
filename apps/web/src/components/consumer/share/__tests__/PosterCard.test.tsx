import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { describe, expect, it } from 'vitest';
import { PosterCard } from '@/components/consumer/share/PosterCard';
import { identityArtDataUri } from '@/lib/share/fallback-art';
import {
  frameArtSize,
  SC_METRICS,
  SC_RATIOS,
  SHARE_RATIOS,
  type ShareRatio,
} from '@/components/consumer/share/definitions/ratios';
import { loadShareFonts } from '@/lib/share/fonts';
import { toShareCard, type ShareCard } from '@/lib/share/share-layout';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
const PUBLIC_DIR = path.resolve(__dirname, '../../../../../public');

// The real bundled faces. Without them satori reaches out to the network for a
// fallback, which makes every assertion below a coin flip on the CI runner's
// egress — and hides the fact that the poster's own fonts were never wired up.
const fontsPromise = loadShareFonts(async (assetPath) => {
  const buffer = await readFile(path.join(PUBLIC_DIR, assetPath));
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  );
});

// A real JPEG (the share board itself), so the blurred-copy and tilted-card
// paths draw real pixels.
const photoPromise = readFile(
  path.resolve(
    __dirname,
    '../../../../../../../design/design_handoff_bplus_redesign/screens/07-more-screens/more-r3-share_shapes.jpg',
  ),
).then((buffer) => `data:image/jpeg;base64,${buffer.toString('base64')}`);

const baseCard = toShareCard(
  {
    artist: 'TOKiMONSTA',
    date: '2026-11-13',
    showTime: '21:00',
    venue: { name: 'The Church', city: 'Denver', timezone: 'America/Denver' },
    genre: ['electronic'],
    status: 'upcoming',
  },
  '2026-11-09',
);

const render = async (
  ratio: ShareRatio,
  photo: string | null,
  card: ShareCard = baseCard,
): Promise<Buffer> => {
  const response = new ImageResponse(
    <PosterCard card={card} ratio={ratio} photo={photo} />,
    { ...SC_RATIOS[ratio], fonts: await fontsPromise },
  );
  return Buffer.from(await response.arrayBuffer());
};

const digest = (buffer: Buffer): string =>
  createHash('sha256').update(buffer).digest('hex');

describe('<PosterCard /> (B+ share card) renders through satori', () => {
  it.each(SHARE_RATIOS)(
    'draws %s with a photo and with the IdentityArt fallback',
    async (ratio) => {
      const withPhoto = await render(ratio, await photoPromise);
      const fallback = await render(ratio, null);
      for (const buffer of [withPhoto, fallback]) {
        expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC);
        // A PNG this small would mean the art layer never drew.
        expect(buffer.length).toBeGreaterThan(20_000);
      }
      expect(digest(withPhoto)).not.toBe(digest(fallback));
    },
    60_000,
  );

  // satori mis-rotates inline SVG on the tilted card, so the route hands the
  // card IdentityArt pre-rendered flat.
  it('draws pre-rendered IdentityArt on the tilted card', async () => {
    const frame = SC_METRICS.square.frame;
    expect(frame).not.toBeNull();
    const size = frame === null ? 0 : frameArtSize(frame);
    const art = await identityArtDataUri('TOKiMONSTA', size);
    expect(art).toMatch(/^data:image\/png;base64,/);
    const response = new ImageResponse(
      <PosterCard card={baseCard} ratio="square" photo={null} frameArt={art} />,
      { ...SC_RATIOS.square, fonts: await fontsPromise },
    );
    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.subarray(0, 4)).toEqual(PNG_MAGIC);
    expect(digest(buffer)).not.toBe(digest(await render('square', null)));
  }, 30_000);

  it('is deterministic: identical input yields byte-identical output', async () => {
    const photo = await photoPromise;
    expect(digest(await render('square', photo))).toBe(
      digest(await render('square', photo)),
    );
  }, 30_000);

  it('draws no chip and no countdown when there is none to draw', async () => {
    const bare = { ...baseCard, chip: null, countdown: null };
    const full = await render('link', null);
    const empty = await render('link', null, bare);
    expect(empty.subarray(0, 4)).toEqual(PNG_MAGIC);
    expect(digest(empty)).not.toBe(digest(full));
  }, 30_000);
});
