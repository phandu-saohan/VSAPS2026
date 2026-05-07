-- Add avatar_url column to submissions table
ALTER TABLE public.submissions ADD COLUMN IF NOT EXISTS avatar_url text;
