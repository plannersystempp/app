ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS can_access_suppliers BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'suppliers' AND policyname = 'suppliers_select_coordinator_access'
  ) THEN
    CREATE POLICY suppliers_select_coordinator_access
      ON public.suppliers
      FOR SELECT
      USING (
        get_user_role_in_team(team_id) IN ('admin','financeiro')
        OR EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.team_id = suppliers.team_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'approved'
            AND tm.can_access_suppliers = true
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'supplier_items' AND policyname = 'supplier_items_select_coordinator_access'
  ) THEN
    CREATE POLICY supplier_items_select_coordinator_access
      ON public.supplier_items
      FOR SELECT
      USING (
        -- Admin/financeiro pelo time do fornecedor relacionado ao item
        EXISTS (
          SELECT 1
          FROM public.suppliers s
          WHERE s.id = supplier_items.supplier_id
            AND get_user_role_in_team(s.team_id) IN ('admin','financeiro')
        )
        OR EXISTS (
          SELECT 1
          FROM public.suppliers s
          JOIN public.team_members tm ON tm.team_id = s.team_id
          WHERE s.id = supplier_items.supplier_id
            AND tm.user_id = auth.uid()
            AND tm.status = 'approved'
            AND tm.can_access_suppliers = true
        )
      );
  END IF;
END $$;
