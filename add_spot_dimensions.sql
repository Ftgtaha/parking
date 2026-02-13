-- Run this in your Supabase SQL Editor to enable custom spot sizing

ALTER TABLE spots 
ADD COLUMN width NUMERIC DEFAULT 60,
ADD COLUMN height NUMERIC DEFAULT 100,
ADD COLUMN rotation NUMERIC DEFAULT 0;
