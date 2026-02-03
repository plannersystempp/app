DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='personnel_allocations' AND column_name='start_time'
  ) THEN
    EXECUTE 'ALTER TABLE public.personnel_allocations ALTER COLUMN start_time DROP DEFAULT';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='personnel_allocations' AND column_name='end_time'
  ) THEN
    EXECUTE 'ALTER TABLE public.personnel_allocations ALTER COLUMN end_time DROP DEFAULT';
  END IF;
END $$;
