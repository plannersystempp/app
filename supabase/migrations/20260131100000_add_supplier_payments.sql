-- Create event_supplier_payments table
CREATE TABLE IF NOT EXISTS public.event_supplier_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_cost_id UUID NOT NULL REFERENCES public.event_supplier_costs(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL CHECK (amount > 0),
    payment_date DATE NOT NULL,
    payment_type TEXT NOT NULL CHECK (payment_type IN ('partial', 'full')),
    created_by_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_supplier_payments_cost_id ON public.event_supplier_payments(supplier_cost_id);

-- Create function to update cost payment status
CREATE OR REPLACE FUNCTION public.update_supplier_cost_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    total_paid NUMERIC;
    cost_total NUMERIC;
    new_status TEXT;
BEGIN
    -- Calculate total paid for the cost item
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM public.event_supplier_payments
    WHERE supplier_cost_id = COALESCE(NEW.supplier_cost_id, OLD.supplier_cost_id);

    -- Get the total cost amount
    SELECT total_amount INTO cost_total
    FROM public.event_supplier_costs
    WHERE id = COALESCE(NEW.supplier_cost_id, OLD.supplier_cost_id);

    -- Determine status
    IF total_paid >= cost_total THEN
        new_status := 'paid';
    ELSIF total_paid > 0 THEN
        new_status := 'partially_paid';
    ELSE
        new_status := 'pending';
    END IF;

    -- Update the parent cost record
    UPDATE public.event_supplier_costs
    SET 
        paid_amount = total_paid,
        payment_status = new_status,
        updated_at = now()
    WHERE id = COALESCE(NEW.supplier_cost_id, OLD.supplier_cost_id);

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS update_supplier_cost_after_payment_insert ON public.event_supplier_payments;
CREATE TRIGGER update_supplier_cost_after_payment_insert
AFTER INSERT ON public.event_supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.update_supplier_cost_payment_status();

DROP TRIGGER IF EXISTS update_supplier_cost_after_payment_update ON public.event_supplier_payments;
CREATE TRIGGER update_supplier_cost_after_payment_update
AFTER UPDATE ON public.event_supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.update_supplier_cost_payment_status();

DROP TRIGGER IF EXISTS update_supplier_cost_after_payment_delete ON public.event_supplier_payments;
CREATE TRIGGER update_supplier_cost_after_payment_delete
AFTER DELETE ON public.event_supplier_payments
FOR EACH ROW EXECUTE FUNCTION public.update_supplier_cost_payment_status();
