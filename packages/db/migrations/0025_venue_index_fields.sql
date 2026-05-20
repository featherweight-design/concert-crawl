ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "neighborhood" text;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "featured" boolean NOT NULL DEFAULT false;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "lat" double precision;--> statement-breakpoint
ALTER TABLE "venues" ADD COLUMN IF NOT EXISTS "lng" double precision;--> statement-breakpoint

-- Seed coordinates and neighborhood for all known Denver venues
UPDATE "venues" SET lat = 39.7313, lng = -104.9719, neighborhood = 'Colfax'            WHERE slug = 'bluebird-theater';
UPDATE "venues" SET lat = 39.7606, lng = -104.9818, neighborhood = 'Five Points'        WHERE slug = 'cervantes-masterpiece-ballroom';
UPDATE "venues" SET lat = 39.5934, lng = -104.8915, neighborhood = 'Greenwood Village'  WHERE slug = 'fiddlers-green-amphitheatre';
UPDATE "venues" SET lat = 39.6491, lng = -104.9885, neighborhood = 'Englewood'          WHERE slug = 'gothic-theatre';
UPDATE "venues" SET lat = 39.7025, lng = -104.9885, neighborhood = 'South Broadway'     WHERE slug = 'hi-dive';
UPDATE "venues" SET lat = 39.7561, lng = -104.9810, neighborhood = 'RiNo'               WHERE slug = 'larimer-lounge';
UPDATE "venues" SET lat = 39.6888, lng = -105.0197, neighborhood = 'Ruby Hill'          WHERE slug = 'levitt-pavilion';
UPDATE "venues" SET lat = 39.7502, lng = -104.9967, neighborhood = 'LoDo'               WHERE slug = 'marquis-theater';
UPDATE "venues" SET lat = 39.7639, lng = -104.9728, neighborhood = 'RiNo'               WHERE slug = 'mission-ballroom';
UPDATE "venues" SET lat = 39.7319, lng = -104.9800, neighborhood = 'Capitol Hill'       WHERE slug = 'ogden-theatre';
UPDATE "venues" SET lat = 39.6654, lng = -105.2057, neighborhood = 'Morrison',
                    featured = true                                                       WHERE slug = 'red-rocks-amphitheatre';
UPDATE "venues" SET lat = 39.7531, lng = -104.9971, neighborhood = 'Ballpark'           WHERE slug = 'summit-music-hall';
UPDATE "venues" SET lat = 39.7333, lng = -104.9789, neighborhood = 'Capitol Hill'       WHERE slug = 'the-fillmore-auditorium';
