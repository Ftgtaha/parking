-- script: fix_zone_images.sql
-- Restore the images for the default/demo zones

-- Update Building A
UPDATE public.zones
SET image_url = '/building-map.png'
WHERE name = 'Building A';

-- Update Outdoor Gate C (if it exists)
UPDATE public.zones
SET image_url = '/outdoor-map.png'
WHERE name = 'Outdoor Gate C';

-- Note: New zones you add will have the correct full URL from storage.
-- This script fixes the old demo zones to use the files in your public folder.
