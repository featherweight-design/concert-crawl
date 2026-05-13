CREATE TYPE "public"."ticket_vendor" AS ENUM(
  'axs',
  'ticketmaster',
  'seatgeek',
  'dice',
  'eventbrite',
  'venue_box_office',
  'unknown'
);

ALTER TABLE "venues" ADD COLUMN "ticket_vendor" "ticket_vendor";
