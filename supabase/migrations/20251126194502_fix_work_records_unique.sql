-- Remover duplicatas existentes mantendo um único registro por (team_id, employee_id, event_id, work_date)
WITH ranked AS (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY team_id, employee_id, event_id, work_date
             ORDER BY id DESC
           ) AS rn
    FROM public.work_records
    WHERE work_date IS NOT NULL
  ) t
  WHERE t.rn > 1
)
DELETE FROM public.work_records WHERE id IN (SELECT id FROM ranked);

-- Garantir unicidade por combinação lógica
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_records_unique_team_emp_event_date 
ON public.work_records (team_id, employee_id, event_id, work_date);