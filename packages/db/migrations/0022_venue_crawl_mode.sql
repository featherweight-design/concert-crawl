ALTER TABLE "venues" ADD COLUMN "crawl_mode" varchar(10) CHECK ("crawl_mode" IN ('http', 'browser'));
