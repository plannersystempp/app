ALTER TABLE event_divisions 
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_event_divisions_order_index ON event_divisions(order_index);
