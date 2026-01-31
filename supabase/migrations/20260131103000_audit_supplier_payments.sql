CREATE OR REPLACE FUNCTION public.audit_supplier_payments_changes()
RETURNS TRIGGER AS $$
DECLARE
    current_user_id UUID;
    v_team_id UUID;
BEGIN
    -- Try to get user ID from session
    current_user_id := auth.uid();
    
    -- Try to get team_id from parent cost
    IF (TG_OP = 'DELETE') THEN
        SELECT team_id INTO v_team_id FROM public.event_supplier_costs WHERE id = OLD.supplier_cost_id;
        
        INSERT INTO public.audit_logs (
            user_id,
            team_id,
            action,
            table_name,
            record_id,
            old_values
        ) VALUES (
            current_user_id,
            v_team_id,
            'DELETE',
            'event_supplier_payments',
            OLD.id::text,
            row_to_json(OLD)
        );
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        SELECT team_id INTO v_team_id FROM public.event_supplier_costs WHERE id = NEW.supplier_cost_id;

        INSERT INTO public.audit_logs (
            user_id,
            team_id,
            action,
            table_name,
            record_id,
            old_values,
            new_values
        ) VALUES (
            current_user_id,
            v_team_id,
            'UPDATE',
            'event_supplier_payments',
            NEW.id::text,
            row_to_json(OLD),
            row_to_json(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        SELECT team_id INTO v_team_id FROM public.event_supplier_costs WHERE id = NEW.supplier_cost_id;

        INSERT INTO public.audit_logs (
            user_id,
            team_id,
            action,
            table_name,
            record_id,
            new_values
        ) VALUES (
            current_user_id,
            v_team_id,
            'INSERT',
            'event_supplier_payments',
            NEW.id::text,
            row_to_json(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS audit_supplier_payments_trigger ON public.event_supplier_payments;
CREATE TRIGGER audit_supplier_payments_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.event_supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.audit_supplier_payments_changes();
