ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "show_on_home" boolean DEFAULT false NOT NULL;
ALTER TABLE "tournaments" ADD COLUMN IF NOT EXISTS "public_registration" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
UPDATE "tournaments" SET "show_on_home" = true, "public_registration" = false WHERE "slug" = 'curico-2026';
