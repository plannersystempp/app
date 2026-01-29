ALTER TABLE public.personnel_allocations
ADD COLUMN IF NOT EXISTS attendance_status TEXT DEFAULT 'pending' CHECK (attendance_status IN ('pending', 'present', 'absent'));

COMMENT ON COLUMN public.personnel_allocations.attendance_status IS 'Status de presença do membro no evento (pending, present, absent).';
