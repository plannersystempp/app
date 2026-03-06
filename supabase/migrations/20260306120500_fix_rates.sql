-- Fix historical rates based on paid amounts

-- Enrico de Souza D’Angelo de Sá in MUSEU DO AMANHÃ - AKILAH RODRIGUES (Expected 4050, Paid 1500)
UPDATE personnel_allocations SET event_specific_cache = 500 WHERE event_id = '1ad53669-beaf-4321-b4b7-9a4d115ebe57' AND personnel_id = 'd142282d-e469-4b66-98d6-6f1944795f9b';

-- Felipe Gomes Oliveira de Abreu in Evento Regressão QA 05/03 (Expected 2100, Paid 700)
UPDATE personnel_allocations SET event_specific_cache = 233.3333 WHERE event_id = '4e479699-55d3-4ddf-aed3-be73e8ce014b' AND personnel_id = '27c1eb30-940c-4312-807a-8fc446a748b9';

-- Jefferson Luiz de Alcântara Nascimento in OTC 2025 (Expected 2000, Paid 1600)
UPDATE personnel_allocations SET event_specific_cache = 400 WHERE event_id = '2b694a74-93cf-40ad-83af-26ec34403893' AND personnel_id = 'e422b9df-140e-481e-a755-30e92bc27134';

-- Marcos Francisco do Nascimento in Festival Futuros Possíveis (Expected 800, Paid 400)
UPDATE personnel_allocations SET event_specific_cache = 200 WHERE event_id = 'f554d5c4-a767-4843-8266-66201aafdee8' AND personnel_id = 'c3ce290d-82a8-4cbd-8a68-2f38ec2fe163';

-- Rayan Perdomo de Oliveira Tavares in Rio Valves 2025 (Expected 1546, Paid 1341.7)
UPDATE personnel_allocations SET event_specific_cache = 350.0087 WHERE event_id = 'ea4e1c35-01e8-4dbc-b72b-3a5a28f1abdb' AND personnel_id = '03b428e2-486a-4962-8f45-3ac92cc54047';

-- Fabio Fontenelle in 1º ORTOPEDIA DOR - HILTON COPACABANA (Expected 1271.7025, Paid 1112.7155)
UPDATE personnel_allocations SET event_specific_cache = 350.0023 WHERE event_id = '7b05bbca-0794-4565-a6b9-196de26ec8d4' AND personnel_id = '0f53f5d7-0369-4479-86ee-580e9fd98ced';

-- Kilma Kellen Alves Pedrosa in Congresso de Diabetes 2025 (Expected 1050, Paid 900)
UPDATE personnel_allocations SET event_specific_cache = 300 WHERE event_id = '91ce496f-9dcc-43a1-b781-f1206f2d38fd' AND personnel_id = '2e164e1c-60d6-47b2-bedf-ee8bf30152b1';

-- Everaldo Silva de Almeida in Rio Valves 2025 (Expected 1200, Paid 1050)
UPDATE personnel_allocations SET event_specific_cache = 350 WHERE event_id = 'ea4e1c35-01e8-4dbc-b72b-3a5a28f1abdb' AND personnel_id = 'a9e94c4c-d4a1-4786-bcd8-9dceaeefaec3';

-- Kilma Kellen Alves Pedrosa in 1º ORTOPEDIA DOR - HILTON COPACABANA (Expected 700, Paid 600)
UPDATE personnel_allocations SET event_specific_cache = 300 WHERE event_id = '7b05bbca-0794-4565-a6b9-196de26ec8d4' AND personnel_id = '2e164e1c-60d6-47b2-bedf-ee8bf30152b1';

-- Everaldo Silva de Almeida in Congresso de Diabetes 2025 (Expected 2256.375, Paid 2173)
UPDATE personnel_allocations SET event_specific_cache = 350.0134 WHERE event_id = '91ce496f-9dcc-43a1-b781-f1206f2d38fd' AND personnel_id = 'a9e94c4c-d4a1-4786-bcd8-9dceaeefaec3';

-- João Bosco Milesi Neto in Torneio Robótica 2025 (Expected 3083.3333333333335, Paid 3066.7)
UPDATE personnel_allocations SET event_specific_cache = 497.3027 WHERE event_id = 'bd3303db-0ea1-4880-848e-cfc07e68d972' AND personnel_id = '265a7799-d02a-43e8-9fcd-9e090d2ce398';

-- Guilherme dos Santos Torres (Toddy) in Rio Valves 2025 (Expected 1210.6, Paid 1210.435)
UPDATE personnel_allocations SET event_specific_cache = 350.0053 WHERE event_id = 'ea4e1c35-01e8-4dbc-b72b-3a5a28f1abdb' AND personnel_id = '2f481391-3c63-4646-b96e-97dd2e3c30d2';
