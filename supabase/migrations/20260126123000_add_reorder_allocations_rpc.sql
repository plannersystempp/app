CREATE OR REPLACE FUNCTION reorder_allocations(updates jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  item jsonb;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(updates)
  LOOP
    UPDATE personnel_allocations
    SET order_index = (item->>'order_index')::int
    WHERE id = (item->>'id')::uuid;
  END LOOP;
END;
$$;
