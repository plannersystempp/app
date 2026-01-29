-- Migration script to copy data from legacy 'absences' table to 'work_records'
-- This ensures historical absence data is preserved in the new structure
-- Idempotent: checks for existence before inserting to avoid duplicates

DO $$
BEGIN
  -- Insert missing absences into work_records
  INSERT INTO public.work_records (
    team_id,
    event_id,
    employee_id,
    work_date,
    attendance_status,
    hours_worked,
    overtime_hours,
    total_pay,
    logged_by_id,
    notes,
    created_at
  )
  SELECT 
    a.team_id,
    pa.event_id,
    pa.personnel_id,
    a.work_date,
    'absent',
    0,
    0,
    0,
    a.logged_by_id,
    a.notes,
    a.created_at
  FROM public.absences a
  JOIN public.personnel_allocations pa ON a.assignment_id = pa.id
  WHERE NOT EXISTS (
    SELECT 1 FROM public.work_records wr 
    WHERE wr.team_id = a.team_id 
      AND wr.employee_id = pa.personnel_id 
      AND wr.event_id = pa.event_id 
      AND wr.work_date = a.work_date
  );

  RAISE NOTICE 'Migration of absences to work_records completed successfully.';
END $$;
