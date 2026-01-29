
-- Add default time columns to events table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'default_entry_time') THEN
        ALTER TABLE events ADD COLUMN default_entry_time TIME WITHOUT TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'default_exit_time') THEN
        ALTER TABLE events ADD COLUMN default_exit_time TIME WITHOUT TIME ZONE;
    END IF;
END $$;

-- Add default time columns to event_divisions table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_divisions' AND column_name = 'default_entry_time') THEN
        ALTER TABLE event_divisions ADD COLUMN default_entry_time TIME WITHOUT TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_divisions' AND column_name = 'default_exit_time') THEN
        ALTER TABLE event_divisions ADD COLUMN default_exit_time TIME WITHOUT TIME ZONE;
    END IF;
END $$;

-- Add time columns to personnel_allocations table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel_allocations' AND column_name = 'start_time') THEN
        ALTER TABLE personnel_allocations ADD COLUMN start_time TIME WITHOUT TIME ZONE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personnel_allocations' AND column_name = 'end_time') THEN
        ALTER TABLE personnel_allocations ADD COLUMN end_time TIME WITHOUT TIME ZONE;
    END IF;
END $$;
