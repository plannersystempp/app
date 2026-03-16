-- WARNING: Migração não destrutiva.
-- Backfill de snapshots (event_specific_cache/event_specific_overtime) para eventos já quitados via payroll_closings.
-- Objetivo: impedir que arredondamentos/alterações futuras de taxa no cadastro reabram eventos antigos.

WITH team_cfg AS (
  SELECT
    t.id AS team_id,
    COALESCE(t.default_overtime_threshold_hours, 8)::NUMERIC AS threshold_hours,
    COALESCE(t.default_convert_overtime_to_daily, FALSE) AS convert_enabled
  FROM public.teams t
),
paid_by_closing AS (
  SELECT
    pc.event_id,
    pc.personnel_id,
    SUM(pc.total_amount_paid)::NUMERIC AS paid
  FROM public.payroll_closings pc
  GROUP BY pc.event_id, pc.personnel_id
),
alloc_rows AS (
  SELECT
    pa.event_id,
    pa.personnel_id,
    MAX(pa.event_specific_cache) FILTER (WHERE COALESCE(pa.event_specific_cache, 0) > 0) AS existing_cache,
    MAX(pa.event_specific_overtime) FILTER (WHERE COALESCE(pa.event_specific_overtime, 0) > 0) AS existing_overtime
  FROM public.personnel_allocations pa
  GROUP BY pa.event_id, pa.personnel_id
),
work_days AS (
  SELECT
    pa.event_id,
    pa.personnel_id,
    COUNT(DISTINCT d)::NUMERIC AS worked_days
  FROM public.personnel_allocations pa
  CROSS JOIN LATERAL unnest(COALESCE(pa.work_days, ARRAY[]::text[])) AS d
  WHERE COALESCE(pa.attendance_status, 'pending') <> 'absent'
  GROUP BY pa.event_id, pa.personnel_id
),
work_logs_by_day AS (
  SELECT
    wr.event_id,
    wr.employee_id AS personnel_id,
    wr.work_date,
    SUM(COALESCE(wr.overtime_hours, 0))::NUMERIC AS overtime_hours_day
  FROM public.work_records wr
  WHERE COALESCE(wr.attendance_status, 'present') <> 'absent'
  GROUP BY wr.event_id, wr.employee_id, wr.work_date
),
overtime_agg AS (
  SELECT
    w.event_id,
    w.personnel_id,
    SUM(w.overtime_hours_day)::NUMERIC AS total_overtime_hours,
    SUM(CASE WHEN w.overtime_hours_day >= tc.threshold_hours THEN 1 ELSE 0 END)::NUMERIC AS overtime_caches_used,
    SUM(
      CASE
        WHEN w.overtime_hours_day >= tc.threshold_hours THEN GREATEST(0, w.overtime_hours_day - 8)
        ELSE w.overtime_hours_day
      END
    )::NUMERIC AS overtime_remaining_hours
  FROM work_logs_by_day w
  JOIN public.events e ON e.id = w.event_id
  JOIN team_cfg tc ON tc.team_id = e.team_id
  GROUP BY w.event_id, w.personnel_id
),
base AS (
  SELECT
    e.id AS event_id,
    p.id AS personnel_id,
    e.team_id,
    COALESCE(wd.worked_days, 0)::NUMERIC AS worked_days,
    COALESCE(oa.total_overtime_hours, 0)::NUMERIC AS total_overtime_hours,
    COALESCE(oa.overtime_caches_used, 0)::NUMERIC AS overtime_caches_used,
    COALESCE(oa.overtime_remaining_hours, 0)::NUMERIC AS overtime_remaining_hours,
    tc.convert_enabled,
    pbc.paid,
    ar.existing_cache,
    ar.existing_overtime
  FROM paid_by_closing pbc
  JOIN public.events e ON e.id = pbc.event_id
  JOIN public.personnel p ON p.id = pbc.personnel_id
  JOIN team_cfg tc ON tc.team_id = e.team_id
  LEFT JOIN work_days wd ON wd.event_id = pbc.event_id AND wd.personnel_id = pbc.personnel_id
  LEFT JOIN overtime_agg oa ON oa.event_id = pbc.event_id AND oa.personnel_id = pbc.personnel_id
  LEFT JOIN alloc_rows ar ON ar.event_id = pbc.event_id AND ar.personnel_id = pbc.personnel_id
),
derived AS (
  SELECT
    b.event_id,
    b.personnel_id,
    b.existing_cache,
    b.existing_overtime,
    b.paid,
    CASE
      WHEN (b.worked_days = 0 AND b.total_overtime_hours = 0) THEN NULL
      ELSE
        b.paid
        /
        (
          b.worked_days
          + CASE
              WHEN b.convert_enabled THEN b.overtime_caches_used + (b.overtime_remaining_hours / 12.0)
              ELSE (b.total_overtime_hours / 12.0)
            END
        )
    END AS implied_cache
  FROM base b
)
UPDATE public.personnel_allocations pa
SET
  event_specific_cache = CASE
    WHEN COALESCE(pa.event_specific_cache, 0) > 0 THEN pa.event_specific_cache
    ELSE d.implied_cache
  END,
  event_specific_overtime = CASE
    WHEN COALESCE(pa.event_specific_overtime, 0) > 0 THEN pa.event_specific_overtime
    ELSE (d.implied_cache / 12.0)
  END
FROM derived d
WHERE pa.event_id = d.event_id
  AND pa.personnel_id = d.personnel_id
  AND d.implied_cache IS NOT NULL
  AND (
    COALESCE(pa.event_specific_cache, 0) <= 0
    OR COALESCE(pa.event_specific_overtime, 0) <= 0
  );
