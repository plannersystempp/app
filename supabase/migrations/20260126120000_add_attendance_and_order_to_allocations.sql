ALTER TABLE personnel_allocations ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_personnel_allocations_order_index ON personnel_allocations(order_index);
