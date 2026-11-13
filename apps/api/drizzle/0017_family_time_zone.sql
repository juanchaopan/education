-- Each family counts its days in its own IANA time zone. Existing families
-- start without one; the deployment's DEFAULT_TIME_ZONE counts their days
-- until a parent's device fills it in the next time the parent space opens.
ALTER TABLE "families" ADD COLUMN "time_zone" text;--> statement-breakpoint
ALTER TABLE "families" ADD CONSTRAINT "family_time_zone_length" CHECK (char_length("families"."time_zone") <= 64);
