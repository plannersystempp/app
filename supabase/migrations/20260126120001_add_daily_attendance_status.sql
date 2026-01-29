ALTER TABLE public.work_records 
ADD COLUMN IF NOT EXISTS attendance_status text CHECK (attendance_status IN ('present', 'absent', 'pending')) DEFAULT 'present';

UPDATE public.work_records SET attendance_status = 'present' WHERE attendance_status IS NULL;
