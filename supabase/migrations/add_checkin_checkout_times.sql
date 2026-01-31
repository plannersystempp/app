DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'work_records'
      AND column_name = 'check_in_time'
  ) THEN
    ALTER TABLE public.work_records
      ADD COLUMN check_in_time TIME WITHOUT TIME ZONE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'work_records'
      AND column_name = 'check_out_time'
  ) THEN
    ALTER TABLE public.work_records
      ADD COLUMN check_out_time TIME WITHOUT TIME ZONE;
  END IF;
END $$;

