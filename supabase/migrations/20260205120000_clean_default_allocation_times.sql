UPDATE public.personnel_allocations
SET start_time = NULL, end_time = NULL
WHERE (start_time LIKE '08:00%' OR start_time = '08:00')
  AND (end_time LIKE '17:00%' OR end_time = '17:00');
