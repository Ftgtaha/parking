-- Add reserved_at column to spots table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'spots' AND column_name = 'reserved_at') THEN
        ALTER TABLE "public"."spots" ADD COLUMN "reserved_at" TIMESTAMPTZ;
    END IF;
END $$;
