ALTER TABLE public.work_records 
ADD COLUMN IF NOT EXISTS logged_by_id uuid REFERENCES auth.users(id);
