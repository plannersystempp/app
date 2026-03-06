
-- Add event_specific_overtime column to personnel_allocations
ALTER TABLE public.personnel_allocations
ADD COLUMN IF NOT EXISTS event_specific_overtime NUMERIC;

COMMENT ON COLUMN public.personnel_allocations.event_specific_overtime IS 'Taxa de hora extra específica para esta alocação; se definida (> 0), sobrepõe a taxa padrão e calculada.';

-- Update the main dashboard function to use this new column
CREATE OR REPLACE FUNCTION get_events_with_payment_status(p_team_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  event_status TEXT,
  end_date DATE,
  payment_due_date DATE,
  allocated_count INT,
  paid_count INT,
  has_pending_payments BOOLEAN
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH team_cfg AS (
    SELECT
      t.id AS team_id,
      COALESCE(t.default_overtime_threshold_hours, 8)::NUMERIC AS threshold_hours,
      COALESCE(t.default_convert_overtime_to_daily, FALSE) AS convert_enabled
    FROM public.teams t
    WHERE t.id = p_team_id
  ),
  alloc_people AS (
    SELECT DISTINCT
      pa.event_id,
      pa.personnel_id
    FROM public.personnel_allocations pa
    JOIN public.personnel p ON p.id = pa.personnel_id
    WHERE pa.team_id = p_team_id
      AND (p.type IS NULL OR TRIM(LOWER(p.type)) NOT IN ('fixo', 'staff_fixo'))
      AND COALESCE(pa.attendance_status, 'pending') <> 'absent'
  ),
  alloc_rates AS (
    SELECT
      pa.event_id,
      pa.personnel_id,
      MAX(pa.event_specific_cache) FILTER (WHERE COALESCE(pa.event_specific_cache, 0) > 0) AS max_event_cache,
      MAX(pa.event_specific_overtime) FILTER (WHERE COALESCE(pa.event_specific_overtime, 0) > 0) AS max_event_overtime,
      MAX(pf.custom_cache) FILTER (
        WHERE COALESCE(pf.custom_cache, 0) > 0
          AND (
            (pa.function_name IS NOT NULL AND f.name = pa.function_name)
          )
      ) AS max_custom_cache,
      MAX(pf.custom_overtime) FILTER (
        WHERE COALESCE(pf.custom_overtime, 0) > 0
          AND (
            (pa.function_name IS NOT NULL AND f.name = pa.function_name)
          )
      ) AS max_custom_overtime
    FROM public.personnel_allocations pa
    LEFT JOIN public.personnel_functions pf ON pf.personnel_id = pa.personnel_id
    LEFT JOIN public.functions f ON f.id = pf.function_id
    WHERE pa.team_id = p_team_id
      AND COALESCE(pa.attendance_status, 'pending') <> 'absent'
    GROUP BY pa.event_id, pa.personnel_id
  ),
  alloc_days AS (
    SELECT
      pa.event_id,
      pa.personnel_id,
      ARRAY_AGG(DISTINCT d.day) FILTER (WHERE d.day IS NOT NULL AND BTRIM(d.day) <> '') AS work_days
    FROM public.personnel_allocations pa
    LEFT JOIN LATERAL UNNEST(COALESCE(pa.work_days, ARRAY[]::TEXT[])) AS d(day) ON TRUE
    WHERE pa.team_id = p_team_id
      AND COALESCE(pa.attendance_status, 'pending') <> 'absent'
    GROUP BY pa.event_id, pa.personnel_id
  ),
  absent_days AS (
    SELECT
      wr.event_id,
      wr.employee_id AS personnel_id,
      ARRAY_AGG(DISTINCT wr.work_date::TEXT) FILTER (WHERE wr.work_date IS NOT NULL) AS absent_days
    FROM public.work_records wr
    WHERE wr.team_id = p_team_id
      AND wr.attendance_status = 'absent'
    GROUP BY wr.event_id, wr.employee_id
  ),
  worked_days AS (
    SELECT
      ad.event_id,
      ad.personnel_id,
      COUNT(DISTINCT d.day)::INT AS worked_days_count
    FROM alloc_days ad
    LEFT JOIN absent_days ab
      ON ab.event_id = ad.event_id AND ab.personnel_id = ad.personnel_id
    LEFT JOIN LATERAL UNNEST(COALESCE(ad.work_days, ARRAY[]::TEXT[])) AS d(day) ON TRUE
    LEFT JOIN LATERAL (
      SELECT 1 AS is_absent
      FROM UNNEST(COALESCE(ab.absent_days, ARRAY[]::TEXT[])) AS a(day)
      WHERE a.day = d.day
      LIMIT 1
    ) AS ax ON TRUE
    WHERE d.day IS NOT NULL
      AND BTRIM(d.day) <> ''
      AND ax IS NULL
    GROUP BY ad.event_id, ad.personnel_id
  ),
  overtime_by_day AS (
    SELECT
      wr.event_id,
      wr.employee_id AS personnel_id,
      wr.work_date,
      SUM(COALESCE(wr.overtime_hours, 0))::NUMERIC AS overtime_hours
    FROM public.work_records wr
    WHERE wr.team_id = p_team_id
      AND wr.work_date IS NOT NULL
    GROUP BY wr.event_id, wr.employee_id, wr.work_date
  ),
  overtime_agg AS (
    SELECT
      obd.event_id,
      obd.personnel_id,
      SUM(obd.overtime_hours)::NUMERIC AS total_overtime_hours,
      COUNT(*) FILTER (
        WHERE tc.convert_enabled
          AND obd.overtime_hours >= tc.threshold_hours
      )::INT AS caches_used,
      SUM(
        CASE
          WHEN tc.convert_enabled AND obd.overtime_hours >= tc.threshold_hours
            THEN GREATEST(0, obd.overtime_hours - 8)
          ELSE obd.overtime_hours
        END
      )::NUMERIC AS remaining_hours
    FROM overtime_by_day obd
    CROSS JOIN team_cfg tc
    GROUP BY obd.event_id, obd.personnel_id, tc.threshold_hours, tc.convert_enabled
  ),
  person_calc AS (
    SELECT
      ap.event_id,
      ap.personnel_id,
      COALESCE(wd.worked_days_count, 0)::NUMERIC AS worked_days,
      CASE
        WHEN COALESCE(ar.max_event_cache, 0) > 0 THEN ar.max_event_cache
        WHEN COALESCE(ar.max_custom_cache, 0) > 0 THEN ar.max_custom_cache
        ELSE COALESCE(p.event_cache, 0)
      END AS daily_cache,
      CASE
        WHEN COALESCE(ar.max_event_overtime, 0) > 0 THEN ar.max_event_overtime
        ELSE
          GREATEST(
            CASE
              WHEN COALESCE(ar.max_custom_overtime, 0) > 0 THEN ar.max_custom_overtime
              ELSE COALESCE(p.overtime_rate, 0)
            END,
            (
              CASE
                WHEN COALESCE(ar.max_event_cache, 0) > 0 THEN ar.max_event_cache
                WHEN COALESCE(ar.max_custom_cache, 0) > 0 THEN ar.max_custom_cache
                ELSE COALESCE(p.event_cache, 0)
              END
            ) / 12.0
          )
      END AS overtime_rate,
      COALESCE(oa.total_overtime_hours, 0) AS total_overtime_hours,
      COALESCE(oa.caches_used, 0)::NUMERIC AS overtime_caches_used,
      COALESCE(oa.remaining_hours, 0) AS overtime_remaining_hours
    FROM alloc_people ap
    JOIN public.personnel p ON p.id = ap.personnel_id
    LEFT JOIN alloc_rates ar ON ar.event_id = ap.event_id AND ar.personnel_id = ap.personnel_id
    LEFT JOIN worked_days wd ON wd.event_id = ap.event_id AND wd.personnel_id = ap.personnel_id
    LEFT JOIN overtime_agg oa ON oa.event_id = ap.event_id AND oa.personnel_id = ap.personnel_id
  ),
  person_expected_paid AS (
    SELECT
      pc.event_id,
      pc.personnel_id,
      (
        (pc.worked_days * pc.daily_cache)
        +
        CASE
          WHEN tc.convert_enabled
            THEN (pc.overtime_caches_used * pc.daily_cache) + (pc.overtime_remaining_hours * pc.overtime_rate)
          ELSE (pc.total_overtime_hours * pc.overtime_rate)
        END
      )::NUMERIC AS expected,
      (
        COALESCE((
          SELECT SUM(pc2.total_amount_paid)
          FROM public.payroll_closings pc2
          WHERE pc2.event_id = pc.event_id
            AND pc2.personnel_id = pc.personnel_id
        ), 0)
        +
        COALESCE((
          SELECT SUM(
            pp.amount
            / CASE
                WHEN cardinality(pp.related_events) = 0 THEN 1
                ELSE cardinality(pp.related_events)
              END
          )
          FROM public.personnel_payments pp
          WHERE pc.event_id = ANY(pp.related_events)
            AND pp.personnel_id = pc.personnel_id
            AND pp.payment_status = 'paid'
        ), 0)
      )::NUMERIC AS paid
    FROM person_calc pc
    CROSS JOIN team_cfg tc
  ),
  event_agg AS (
    SELECT
      pep.event_id,
      COUNT(DISTINCT pep.personnel_id)::INT AS allocated_count,
      COUNT(DISTINCT CASE
        WHEN pep.paid >= pep.expected - 0.10 THEN pep.personnel_id
        ELSE NULL
      END)::INT AS paid_count,
      COALESCE(BOOL_OR(pep.expected > pep.paid + 0.10), FALSE) AS has_pending_payments
    FROM person_expected_paid pep
    GROUP BY pep.event_id
  )
  SELECT
    e.id,
    e.name,
    e.status,
    e.end_date::DATE,
    e.payment_due_date::DATE,
    COALESCE(ea.allocated_count, 0),
    COALESCE(ea.paid_count, 0),
    COALESCE(ea.has_pending_payments, FALSE)
  FROM public.events e
  LEFT JOIN event_agg ea ON ea.event_id = e.id
  WHERE e.team_id = p_team_id
  ORDER BY e.start_date DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_events_with_payment_status(UUID) TO authenticated;
