ALTER TABLE public.work_records
  ADD COLUMN IF NOT EXISTS logged_by_id uuid;

ALTER TABLE public.work_records
  ADD CONSTRAINT work_records_logged_by_id_fkey
  FOREIGN KEY (logged_by_id)
  REFERENCES public.user_profiles(user_id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_records_logged_by ON public.work_records(logged_by_id);

CREATE OR REPLACE FUNCTION public.work_records_set_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
  IF NEW.logged_by_id IS NULL THEN
    NEW.logged_by_id := auth.uid();
  END IF;
  IF NEW.date_logged IS NULL THEN
    NEW.date_logged := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_records_set_defaults_trg ON public.work_records;
CREATE TRIGGER work_records_set_defaults_trg
BEFORE INSERT ON public.work_records
FOR EACH ROW
EXECUTE FUNCTION public.work_records_set_defaults();