-- v9: Fix date vs text type mismatch
-- work_records.work_date is DATE, personnel_allocations.work_days is TEXT[]
-- Must cast work_date to TEXT for comparison

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
) AS $$
BEGIN
    RETURN QUERY
    WITH distinct_allocs AS (
        SELECT DISTINCT
            alloc.event_id AS ev_id,
            alloc.personnel_id AS pers_id
        FROM personnel_allocations alloc
        JOIN personnel pers ON pers.id = alloc.personnel_id
        WHERE alloc.team_id = p_team_id
          AND (pers.type IS NULL OR TRIM(LOWER(pers.type)) NOT IN ('fixo', 'staff_fixo'))
    ),
    person_totals AS (
        SELECT 
            da.ev_id,
            da.pers_id,
            (
                (
                    SELECT COUNT(DISTINCT wd.day)::NUMERIC
                    FROM (
                        SELECT UNNEST(a2.work_days) AS day
                        FROM personnel_allocations a2
                        WHERE a2.event_id = da.ev_id 
                          AND a2.personnel_id = da.pers_id
                          AND a2.team_id = p_team_id
                    ) wd
                    WHERE wd.day IS NOT NULL 
                      AND BTRIM(wd.day) <> ''
                      AND NOT EXISTS (
                          SELECT 1 FROM work_records wr_abs
                          WHERE wr_abs.event_id = da.ev_id 
                            AND wr_abs.employee_id = da.pers_id
                            AND wr_abs.attendance_status = 'absent'
                            AND wr_abs.work_date::TEXT = wd.day
                      )
                )
                *
                COALESCE(
                    NULLIF((
                        SELECT MAX(a3.event_specific_cache)
                        FROM personnel_allocations a3
                        WHERE a3.event_id = da.ev_id 
                          AND a3.personnel_id = da.pers_id 
                          AND a3.event_specific_cache > 0
                    ), 0),
                    pers.event_cache,
                    0
                )
            )
            +
            (
                COALESCE((
                    SELECT SUM(COALESCE(wr_ot.overtime_hours, 0))
                    FROM work_records wr_ot
                    WHERE wr_ot.event_id = da.ev_id 
                      AND wr_ot.employee_id = da.pers_id
                ), 0)
                *
                GREATEST(
                    COALESCE(pers.overtime_rate, 0),
                    COALESCE(
                        NULLIF((
                            SELECT MAX(a4.event_specific_cache)
                            FROM personnel_allocations a4
                            WHERE a4.event_id = da.ev_id 
                              AND a4.personnel_id = da.pers_id 
                              AND a4.event_specific_cache > 0
                        ), 0),
                        pers.event_cache,
                        0
                    ) / 12.0
                )
            ) AS expected_amount,
            (
                COALESCE((
                    SELECT SUM(cls.total_amount_paid)
                    FROM payroll_closings cls
                    WHERE cls.event_id = da.ev_id 
                      AND cls.personnel_id = da.pers_id
                ), 0)
                +
                COALESCE((
                    SELECT SUM(
                        ppy.amount / CASE 
                            WHEN ppy.related_events IS NULL OR cardinality(ppy.related_events) = 0 THEN 1 
                            ELSE cardinality(ppy.related_events) 
                        END
                    )
                    FROM personnel_payments ppy
                    WHERE da.ev_id::TEXT = ANY(ppy.related_events) 
                      AND ppy.personnel_id = da.pers_id 
                      AND ppy.payment_status = 'paid'
                ), 0)
            ) AS paid_amount
        FROM distinct_allocs da
        JOIN personnel pers ON pers.id = da.pers_id
    ),
    event_agg AS (
        SELECT 
            pt.ev_id,
            COUNT(DISTINCT pt.pers_id)::INT AS alloc_count,
            COUNT(DISTINCT CASE 
                WHEN pt.paid_amount >= pt.expected_amount - 0.10 AND pt.expected_amount > 0 
                THEN pt.pers_id 
            END)::INT AS paid_ct,
            COALESCE(BOOL_OR(pt.expected_amount > pt.paid_amount + 0.10), FALSE) AS pending
        FROM person_totals pt
        GROUP BY pt.ev_id
    )
    SELECT 
        ev.id,
        ev.name,
        ev.status,
        ev.end_date::DATE,
        ev.payment_due_date::DATE,
        COALESCE(ea.alloc_count, 0),
        COALESCE(ea.paid_ct, 0),
        COALESCE(ea.pending, FALSE)
    FROM events ev
    LEFT JOIN event_agg ea ON ea.ev_id = ev.id
    WHERE ev.team_id = p_team_id
    ORDER BY ev.start_date DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_events_with_payment_status(UUID) TO authenticated;
