-- Add reserved_by column to spots table
ALTER TABLE public.spots 
ADD COLUMN IF NOT EXISTS reserved_by uuid;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_spots_reserved_by ON public.spots(reserved_by);

-- Comment on column
COMMENT ON COLUMN public.spots.reserved_by IS 'References the auth.users.id of the user who reserved the spot';
