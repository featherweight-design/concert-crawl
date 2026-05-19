ALTER TABLE "venues" ADD COLUMN "address" text;

-- Back-fill known Denver venues so staging data is immediately useful
UPDATE "venues" SET "address" = '18300 W Alameda Pkwy, Morrison, CO 80465' WHERE "slug" = 'red-rocks-amphitheatre';
UPDATE "venues" SET "address" = '935 E Colfax Ave, Denver, CO 80218' WHERE "slug" = 'ogden-theatre';
UPDATE "venues" SET "address" = '4242 Wynkoop St, Denver, CO 80211' WHERE "slug" = 'mission-ballroom';
UPDATE "venues" SET "address" = '3317 E Colfax Ave, Denver, CO 80206' WHERE "slug" = 'bluebird-theater';
UPDATE "venues" SET "address" = '3263 S Broadway, Englewood, CO 80113' WHERE "slug" = 'gothic-theatre';
UPDATE "venues" SET "address" = '1510 Clarkson St, Denver, CO 80218' WHERE "slug" = 'fillmore-auditorium';
UPDATE "venues" SET "address" = '1510 Clarkson St, Denver, CO 80218' WHERE "slug" = 'colorado-fillmore';
UPDATE "venues" SET "address" = '2009 Larimer St, Denver, CO 80205' WHERE "slug" = 'marquis-theater';
UPDATE "venues" SET "address" = '1902 Blake St, Denver, CO 80202' WHERE "slug" = 'summit-music-hall';
UPDATE "venues" SET "address" = '4483 Logan St, Denver, CO 80216' WHERE "slug" = 'globe-hall';
UPDATE "venues" SET "address" = '2637 Welton St, Denver, CO 80205' WHERE "slug" = 'cervantes-masterpiece-ballroom';
UPDATE "venues" SET "address" = '1621 Glenarm Pl, Denver, CO 80202' WHERE "slug" = 'paramount-theatre';
UPDATE "venues" SET "address" = '1000 Chopper Cir, Denver, CO 80204' WHERE "slug" = 'ball-arena';
UPDATE "venues" SET "address" = '1338 1st St, Denver, CO 80204' WHERE "slug" = 'meow-wolf-denver';
UPDATE "venues" SET "address" = '6350 Greenwood Plaza Blvd, Greenwood Village, CO 80111' WHERE "slug" = 'fiddlers-green-amphitheatre';
UPDATE "venues" SET "address" = '144 W Colfax Ave, Denver, CO 80202' WHERE "slug" = 'mcnichols-civic-center-building';
UPDATE "venues" SET "address" = '1007 York St, Denver, CO 80206' WHERE "slug" = 'denver-botanic-gardens';
UPDATE "venues" SET "address" = '1380 W Florida Ave, Denver, CO 80223' WHERE "slug" = 'levitt-pavilion-denver';
