-- Fix historical rates based on paid amounts

-- Rayan Perdomo de Oliveira Tavares in Rio Valves 2025 (Expected 1546.0348, Paid 1341.7)
UPDATE personnel_allocations SET event_specific_cache = 350.0087, event_specific_overtime = 29.1674 WHERE event_id = 'ea4e1c35-01e8-4dbc-b72b-3a5a28f1abdb' AND personnel_id = '03b428e2-486a-4962-8f45-3ac92cc54047';

-- Everaldo Silva de Almeida in Congresso de Diabetes 2025 (Expected 2183.4554, Paid 2173)
UPDATE personnel_allocations SET event_specific_cache = 350.0134, event_specific_overtime = 29.1678 WHERE event_id = '91ce496f-9dcc-43a1-b781-f1206f2d38fd' AND personnel_id = 'a9e94c4c-d4a1-4786-bcd8-9dceaeefaec3';

-- Fabio Fontenelle in 1º ORTOPEDIA DOR - HILTON COPACABANA (Expected 1121.7094, Paid 1112.7155)
UPDATE personnel_allocations SET event_specific_cache = 350.0023, event_specific_overtime = 29.1669 WHERE event_id = '7b05bbca-0794-4565-a6b9-196de26ec8d4' AND personnel_id = '0f53f5d7-0369-4479-86ee-580e9fd98ced';

-- Guilherme dos Santos Torres (Toddy) in Rio Valves 2025 (Expected 1210.6159, Paid 1210.435)
UPDATE personnel_allocations SET event_specific_cache = 350.0053, event_specific_overtime = 29.1671 WHERE event_id = 'ea4e1c35-01e8-4dbc-b72b-3a5a28f1abdb' AND personnel_id = '2f481391-3c63-4646-b96e-97dd2e3c30d2';
