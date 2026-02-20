DO $$
BEGIN
  IF to_regprocedure('public.update_subscription_updated_at()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_subscription_updated_at() SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.generate_error_report_number()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.generate_error_report_number() SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.set_error_report_number()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.set_error_report_number() SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.update_supplier_cost_payment_status()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_supplier_cost_payment_status() SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.update_supplier_cost_payment()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.update_supplier_cost_payment() SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.audit_supplier_payments_changes()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.audit_supplier_payments_changes() SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.audit_supplier_payments_channel()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.audit_supplier_payments_channel() SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.get_personnel_stats(uuid,text,text,uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.get_personnel_stats(uuid, text, text, uuid) SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.get_personnel_with_functions(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.get_personnel_with_functions(uuid) SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.get_personnel_with_functions_v2(uuid)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.get_personnel_with_functions_v2(uuid) SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.reorder_allocations(jsonb)') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.reorder_allocations(jsonb) SET search_path = pg_catalog, public';
  END IF;

  IF to_regprocedure('public.sanitize_personnel_fields()') IS NOT NULL THEN
    EXECUTE 'ALTER FUNCTION public.sanitize_personnel_fields() SET search_path = pg_catalog, public';
  END IF;
END $$;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER VIEW public.freelancer_ratings_enriched SET (security_invoker = true)';
  EXCEPTION
    WHEN undefined_object THEN NULL;
    WHEN feature_not_supported THEN NULL;
    WHEN syntax_error_or_access_rule_violation THEN NULL;
  END;
END $$;

ALTER TABLE IF EXISTS public.event_supplier_payments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_supplier_payments TO authenticated;

DROP POLICY IF EXISTS "Acesso granular a pagamentos de custos" ON public.event_supplier_payments;

CREATE POLICY "Acesso granular a pagamentos de custos"
ON public.event_supplier_payments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.event_supplier_costs esc
    WHERE esc.id = event_supplier_payments.supplier_cost_id
      AND (
        is_super_admin()
        OR (
          is_team_member(esc.team_id)
          AND (
            get_user_role_in_team(esc.team_id) = 'admin'
            OR (
              get_user_role_in_team(esc.team_id) = 'coordinator'
              AND has_event_permission(auth.uid(), esc.event_id, 'costs')
            )
          )
        )
      )
  )
);

DROP POLICY IF EXISTS "Coordenadores podem gerenciar pagamentos se autorizados" ON public.event_supplier_payments;

CREATE POLICY "Coordenadores podem gerenciar pagamentos se autorizados"
ON public.event_supplier_payments
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.event_supplier_costs esc
    WHERE esc.id = event_supplier_payments.supplier_cost_id
      AND (
        get_user_role_in_team(esc.team_id) = 'admin'
        OR (
          get_user_role_in_team(esc.team_id) = 'coordinator'
          AND has_event_permission(auth.uid(), esc.event_id, 'costs')
          AND has_event_permission(auth.uid(), esc.event_id, 'edit')
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.event_supplier_costs esc
    WHERE esc.id = event_supplier_payments.supplier_cost_id
      AND (
        get_user_role_in_team(esc.team_id) = 'admin'
        OR (
          get_user_role_in_team(esc.team_id) = 'coordinator'
          AND has_event_permission(auth.uid(), esc.event_id, 'costs')
          AND has_event_permission(auth.uid(), esc.event_id, 'edit')
        )
      )
  )
);

CREATE SCHEMA IF NOT EXISTS extensions;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_net' AND n.nspname = 'public'
  ) THEN
    BEGIN
      ALTER EXTENSION pg_net SET SCHEMA extensions;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_cron' AND n.nspname = 'public'
  ) THEN
    BEGIN
      ALTER EXTENSION pg_cron SET SCHEMA extensions;
    EXCEPTION
      WHEN OTHERS THEN NULL;
    END;
  END IF;
END $$;
