-- Atualiza get_events_with_payment_status para calcular cachê esperado somando taxa por dia/alocação
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
  alloc_days_expanded AS (
    SELECT
      pa.event_id,
      pa.personnel_id,
      d.day::DATE AS work_day,
      pa.function_name,
      pa.event_specific_cache,
      pa.event_specific_overtime
    FROM public.personnel_allocations pa
    LEFT JOIN LATERAL UNNEST(COALESCE(pa.work_days, ARRAY[]::TEXT[])) AS d(day) ON TRUE
    WHERE pa.team_id = p_team_id
      AND COALESCE(pa.attendance_status, 'pending') <> 'absent'
      AND d.day IS NOT NULL
      AND BTRIM(d.day) <> ''
  ),
  absent_days AS (
    SELECT
      wr.event_id,
      wr.employee_id AS personnel_id,
      wr.work_date::DATE AS work_day
    FROM public.work_records wr
    WHERE wr.team_id = p_team_id
      AND wr.attendance_status = 'absent'
      AND wr.work_date IS NOT NULL
  ),
  alloc_days_worked AS (
    SELECT
      ade.*
    FROM alloc_days_expanded ade
    LEFT JOIN absent_days ab
      ON ab.event_id = ade.event_id
     AND ab.personnel_id = ade.personnel_id
     AND ab.work_day = ade.work_day
    WHERE ab.work_day IS NULL
  ),
  alloc_day_rates AS (
    SELECT
      adw.event_id,
      adw.personnel_id,
      adw.work_day,
      CASE
        WHEN COALESCE(adw.event_specific_cache, 0) > 0 THEN adw.event_specific_cache
        WHEN COALESCE(fc.custom_cache, 0) > 0 THEN fc.custom_cache
        ELSE COALESCE(p.event_cache, 0)
      END::NUMERIC AS daily_cache,
      CASE
        WHEN COALESCE(adw.event_specific_overtime, 0) > 0 THEN adw.event_specific_overtime
        ELSE
          GREATEST(
            COALESCE(fo.custom_overtime, 0),
            COALESCE(p.overtime_rate, 0),
            (
              CASE
                WHEN COALESCE(adw.event_specific_cache, 0) > 0 THEN adw.event_specific_cache
                WHEN COALESCE(fc.custom_cache, 0) > 0 THEN fc.custom_cache
                ELSE COALESCE(p.event_cache, 0)
              END
            ) / 12.0
          )
      END::NUMERIC AS overtime_rate
    FROM alloc_days_worked adw
    JOIN public.personnel p ON p.id = adw.personnel_id
    LEFT JOIN LATERAL (
      SELECT MAX(pf.custom_cache)::NUMERIC AS custom_cache
      FROM public.personnel_functions pf
      JOIN public.functions f ON f.id = pf.function_id
      WHERE pf.personnel_id = adw.personnel_id
        AND COALESCE(pf.custom_cache, 0) > 0
        AND adw.function_name IS NOT NULL
        AND f.name = adw.function_name
    ) fc ON TRUE
    LEFT JOIN LATERAL (
      SELECT MAX(pf.custom_overtime)::NUMERIC AS custom_overtime
      FROM public.personnel_functions pf
      JOIN public.functions f ON f.id = pf.function_id
      WHERE pf.personnel_id = adw.personnel_id
        AND COALESCE(pf.custom_overtime, 0) > 0
        AND adw.function_name IS NOT NULL
        AND f.name = adw.function_name
    ) fo ON TRUE
  ),
  alloc_people AS (
    SELECT DISTINCT
      adr.event_id,
      adr.personnel_id
    FROM alloc_day_rates adr
    JOIN public.personnel p ON p.id = adr.personnel_id
    WHERE (p.type IS NULL OR TRIM(LOWER(p.type)) NOT IN ('fixo', 'staff_fixo'))
  ),
  cache_agg AS (
    SELECT
      adr.event_id,
      adr.personnel_id,
      COUNT(DISTINCT adr.work_day)::INT AS worked_days_count,
      SUM(adr.daily_cache)::NUMERIC AS cache_total,
      MAX(adr.overtime_rate)::NUMERIC AS overtime_rate
    FROM alloc_day_rates adr
    GROUP BY adr.event_id, adr.personnel_id
  ),
  overtime_by_day AS (
    SELECT
      wr.event_id,
      wr.employee_id AS personnel_id,
      wr.work_date::DATE AS work_day,
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
      )::NUMERIC AS remaining_hours,
      SUM(
        CASE
          WHEN tc.convert_enabled AND obd.overtime_hours >= tc.threshold_hours
            THEN COALESCE(adr.daily_cache, 0)
          ELSE 0
        END
      )::NUMERIC AS overtime_cache_payment
    FROM overtime_by_day obd
    CROSS JOIN team_cfg tc
    LEFT JOIN alloc_day_rates adr
      ON adr.event_id = obd.event_id
     AND adr.personnel_id = obd.personnel_id
     AND adr.work_day = obd.work_day
    GROUP BY obd.event_id, obd.personnel_id, tc.threshold_hours, tc.convert_enabled
  ),
  person_expected_paid AS (
    SELECT
      ap.event_id,
      ap.personnel_id,
      (
        COALESCE(ca.cache_total, 0)
        +
        CASE
          WHEN tc.convert_enabled
            THEN COALESCE(oa.overtime_cache_payment, 0) + (COALESCE(oa.remaining_hours, 0) * COALESCE(ca.overtime_rate, 0))
          ELSE (COALESCE(oa.total_overtime_hours, 0) * COALESCE(ca.overtime_rate, 0))
        END
      )::NUMERIC AS expected,
      (
        COALESCE((
          SELECT SUM(pc2.total_amount_paid)
          FROM public.payroll_closings pc2
          WHERE pc2.event_id = ap.event_id
            AND pc2.personnel_id = ap.personnel_id
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
          WHERE ap.event_id = ANY(pp.related_events)
            AND pp.personnel_id = ap.personnel_id
            AND pp.payment_status = 'paid'
        ), 0)
      )::NUMERIC AS paid
    FROM alloc_people ap
    CROSS JOIN team_cfg tc
    LEFT JOIN cache_agg ca
      ON ca.event_id = ap.event_id AND ca.personnel_id = ap.personnel_id
    LEFT JOIN overtime_agg oa
      ON oa.event_id = ap.event_id AND oa.personnel_id = ap.personnel_id
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

