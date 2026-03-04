-- Fix Dashboard Pending Events Logic (Account for Absences)
-- This migration updates get_events_with_payment_status to subtract absences from expected days.

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
    WITH person_totals AS (
        -- Calcula o esperado e o pago por PESSOA e por EVENTO
        SELECT
            pa.event_id,
            pa.personnel_id,
            -- Esperado: ((Dias alocados - Dias de falta) * Cache) + (Soma de Horas Extras * Taxa)
            (
                (
                    GREATEST(0, 
                        COALESCE(cardinality(pa.work_days), 0) - 
                        COALESCE((
                            SELECT COUNT(*)
                            FROM work_records wr
                            WHERE wr.event_id = pa.event_id 
                            AND wr.employee_id = pa.personnel_id 
                            AND wr.attendance_status = 'absent'
                        ), 0)
                    ) * COALESCE(pa.event_specific_cache, p.event_cache, 0)
                )
                +
                COALESCE((
                    SELECT SUM(COALESCE(wr.overtime_hours, 0) * COALESCE(p.overtime_rate, 0))
                    FROM work_records wr
                    WHERE wr.event_id = pa.event_id AND wr.employee_id = pa.personnel_id
                ), 0)
            ) as expected,
            -- Pago: (payroll_closings) + (personnel_payments rateado por evento)
            (
                COALESCE((
                    SELECT SUM(pc.total_amount_paid)
                    FROM payroll_closings pc
                    WHERE pc.event_id = pa.event_id AND pc.personnel_id = pa.personnel_id
                ), 0)
                +
                COALESCE((
                    SELECT SUM(pp.amount / CASE WHEN cardinality(pp.related_events) = 0 THEN 1 ELSE cardinality(pp.related_events) END)
                    FROM personnel_payments pp
                    WHERE pa.event_id::text = ANY(pp.related_events) AND pp.personnel_id = pa.personnel_id AND pp.payment_status = 'paid'
                ), 0)
            ) as paid
        FROM personnel_allocations pa
        JOIN personnel p ON p.id = pa.personnel_id
        WHERE pa.team_id = p_team_id
        AND (p.type IS NULL OR TRIM(LOWER(p.type)) NOT IN ('fixo', 'staff_fixo'))
    ),
    event_aggregation AS (
        SELECT
            pt.event_id,
            COUNT(DISTINCT pt.personnel_id)::INT as total_allocated,
            -- Considera pago se (pago >= esperado - tolerancia) OU se esperado é 0 (ex: só faltas)
            COUNT(DISTINCT CASE 
                WHEN pt.paid >= pt.expected - 0.10 THEN pt.personnel_id 
                ELSE NULL 
            END)::INT as total_paid,
            -- Tem pendência se existe alguém onde esperado > pago + tolerancia
            COALESCE(BOOL_OR(pt.expected > pt.paid + 0.10), FALSE) as has_pending
        FROM person_totals pt
        GROUP BY pt.event_id
    )
    SELECT
        e.id,
        e.name,
        e.status,
        e.end_date::DATE,
        e.payment_due_date::DATE,
        COALESCE(ea.total_allocated, 0),
        COALESCE(ea.total_paid, 0),
        COALESCE(ea.has_pending, FALSE)
    FROM events e
    LEFT JOIN event_aggregation ea ON ea.event_id = e.id
    WHERE e.team_id = p_team_id
    ORDER BY e.start_date DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
