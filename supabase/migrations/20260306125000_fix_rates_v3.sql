-- Fix historical rates based on paid amounts

-- Rayan Perdomo de Oliveira Tavares in Rio Valves 2025 (Expected 1545.8718, Paid 1341.7)
UPDATE personnel_allocations SET event_specific_cache = 350.0087, event_specific_overtime = 29.1674 WHERE event_id = 'ea4e1c35-01e8-4dbc-b72b-3a5a28f1abdb' AND personnel_id = '03b428e2-486a-4962-8f45-3ac92cc54047';
