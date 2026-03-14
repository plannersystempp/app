-- WARNING: Migração não destrutiva. Atualiza snapshots históricos para evitar retroação de taxa.
-- WARNING: Executar apenas para corrigir eventos já quitados com pendência indevida por mudança de cadastro.
-- Fix historical rates based on paid amounts

-- Luiz Henrique de Oliveira Rodrigues in Congresso de Diabetes 2025 (Expected 2083.375, Paid 1823)
UPDATE personnel_allocations SET event_specific_cache = 350.016, event_specific_overtime = 29.168 WHERE event_id = '91ce496f-9dcc-43a1-b781-f1206f2d38fd' AND personnel_id = '4e5ef7a1-30b2-494c-bf65-8cf5b93aed9e';

-- Luiz Henrique de Oliveira Rodrigues in Torneio Robótica 2025 (Expected 1600, Paid 1400)
UPDATE personnel_allocations SET event_specific_cache = 350, event_specific_overtime = 29.1667 WHERE event_id = 'bd3303db-0ea1-4880-848e-cfc07e68d972' AND personnel_id = '4e5ef7a1-30b2-494c-bf65-8cf5b93aed9e';

-- Luiz Henrique de Oliveira Rodrigues in Jornada Transição Energética 			 (Expected 800, Paid 700)
UPDATE personnel_allocations SET event_specific_cache = 350, event_specific_overtime = 29.1667 WHERE event_id = '6ab9d06d-dcde-404c-9681-8dcc227dfd2f' AND personnel_id = '4e5ef7a1-30b2-494c-bf65-8cf5b93aed9e';

-- Luiz Henrique de Oliveira Rodrigues in PRÊMIO SIND TALKS (Expected 400, Paid 350)
UPDATE personnel_allocations SET event_specific_cache = 350, event_specific_overtime = 29.1667 WHERE event_id = '6a044a98-16e0-41db-85c1-f30091bf67d1' AND personnel_id = '4e5ef7a1-30b2-494c-bf65-8cf5b93aed9e';

-- Luiz Henrique de Oliveira Rodrigues in ANCLIVEPA 4 SALAS (Expected 1433.35, Paid 1429.17)
UPDATE personnel_allocations SET event_specific_cache = 350.0008, event_specific_overtime = 29.1667 WHERE event_id = 'c4d6e623-d597-4a20-ad25-61a44e4d3668' AND personnel_id = '4e5ef7a1-30b2-494c-bf65-8cf5b93aed9e';
