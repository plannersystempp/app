-- WARNING: Migração não destrutiva. Cria proteção automática de snapshot histórico ao alterar taxa base de pessoal.
-- WARNING: Evita retroação de diária/HE em eventos concluídos já pagos.

CREATE OR REPLACE FUNCTION public.freeze_historical_rates_on_personnel_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $$
BEGIN
  IF COALESCE(NEW.event_cache, 0) = COALESCE(OLD.event_cache, 0)
     AND COALESCE(NEW.overtime_rate, 0) = COALESCE(OLD.overtime_rate, 0) THEN
    RETURN NEW;
  END IF;

  UPDATE public.personnel_allocations pa
  SET
    event_specific_cache = CASE
      WHEN COALESCE(pa.event_specific_cache, 0) > 0 THEN pa.event_specific_cache
      ELSE COALESCE(OLD.event_cache, 0)
    END,
    event_specific_overtime = CASE
      WHEN COALESCE(pa.event_specific_overtime, 0) > 0 THEN pa.event_specific_overtime
      ELSE GREATEST(COALESCE(OLD.overtime_rate, 0), COALESCE(OLD.event_cache, 0) / 12.0)
    END
  FROM public.events e
  WHERE pa.event_id = e.id
    AND pa.personnel_id = NEW.id
    AND e.team_id = NEW.team_id
    AND LOWER(COALESCE(e.status, '')) IN ('concluido', 'concluded', 'concluido_pagamento_pendente')
    AND (
      EXISTS (
        SELECT 1
        FROM public.payroll_closings pc
        WHERE pc.event_id = pa.event_id
          AND pc.personnel_id = pa.personnel_id
      )
      OR EXISTS (
        SELECT 1
        FROM public.personnel_payments pp
        WHERE pp.personnel_id = pa.personnel_id
          AND pp.team_id = e.team_id
          AND pp.payment_status = 'paid'
          AND pa.event_id::text = ANY(pp.related_events)
      )
    )
    AND (
      COALESCE(pa.event_specific_cache, 0) <= 0
      OR COALESCE(pa.event_specific_overtime, 0) <= 0
    );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_historical_rates_on_personnel_update ON public.personnel;

CREATE TRIGGER trg_freeze_historical_rates_on_personnel_update
BEFORE UPDATE OF event_cache, overtime_rate
ON public.personnel
FOR EACH ROW
EXECUTE FUNCTION public.freeze_historical_rates_on_personnel_update();
