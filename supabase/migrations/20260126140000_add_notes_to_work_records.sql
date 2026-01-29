ALTER TABLE public.work_records 
ADD COLUMN IF NOT EXISTS notes text;
