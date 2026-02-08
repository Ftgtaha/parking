-- Add spot dimensions to zones table
ALTER TABLE public.zones 
ADD COLUMN IF NOT EXISTS spot_width INTEGER DEFAULT 60 NOT NULL,
ADD COLUMN IF NOT EXISTS spot_height INTEGER DEFAULT 100 NOT NULL;
