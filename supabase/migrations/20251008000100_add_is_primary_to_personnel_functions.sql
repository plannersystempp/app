-- Add is_primary flag to personnel_functions to mark primary function per person
ALTER TABLE public.personnel_functions
ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;

-- Optional: ensure only one primary per personnel via constraint (soft enforcement handled in app)
-- NOTE: Implemented in application logic; database constraint may be added later if needed.