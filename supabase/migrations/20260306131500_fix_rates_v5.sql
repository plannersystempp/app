-- Fix historical rates based on paid amounts

-- Luiz Henrique de Oliveira Rodrigues in RIO PIPELINE 25 (Expected 1487.6, Paid 1487.51)
UPDATE personnel_allocations SET event_specific_cache = 350.0024, event_specific_overtime = 29.1669 WHERE event_id = '71114aff-5536-4ad6-8372-17480b596c0e' AND personnel_id = '4e5ef7a1-30b2-494c-bf65-8cf5b93aed9e';

-- Paulo Henrique Soares da Silva (Silva) in RIO PIPELINE 25 (Expected 2173, Paid 2172.925)
UPDATE personnel_allocations SET event_specific_cache = 350.0013, event_specific_overtime = 29.1668 WHERE event_id = '71114aff-5536-4ad6-8372-17480b596c0e' AND personnel_id = 'f7fd30df-20ca-4ba6-aa4f-b8f5f61154d1';

-- Eduardo Correa André in 1º ORTOPEDIA DOR - HILTON COPACABANA (Expected 1589.655, Paid 1589.5905)
UPDATE personnel_allocations SET event_specific_cache = 500.0023, event_specific_overtime = 41.6669 WHERE event_id = '7b05bbca-0794-4565-a6b9-196de26ec8d4' AND personnel_id = 'b5fbd329-9b6b-4a67-af59-d0ae8aec4660';

-- Fabio Barboza de Oliveira (Fabio Oliver) in 1º ORTOPEDIA DOR - HILTON COPACABANA (Expected 1112.78, Paid 1112.7155)
UPDATE personnel_allocations SET event_specific_cache = 350.0023, event_specific_overtime = 29.1669 WHERE event_id = '7b05bbca-0794-4565-a6b9-196de26ec8d4' AND personnel_id = '9289f051-53a5-4963-8174-10f2777c137a';

-- Luis Cláudio da Silva Fernandes in THE LED (Expected 500.05, Paid 499.99)
UPDATE personnel_allocations SET event_specific_cache = 399.992, event_specific_overtime = 33.3327 WHERE event_id = '9e01a528-fbe4-400e-94aa-40331fa4f70b' AND personnel_id = 'b2439de1-73f4-49d4-a8b1-58d3de6ba871';

-- Vitor Moreira de Brito Oliveira in FESTA VETNIL (Expected 1083.4, Paid 1083.34)
UPDATE personnel_allocations SET event_specific_cache = 500.0031, event_specific_overtime = 41.6669 WHERE event_id = '4e7f7c17-4531-4b26-b0e4-7edd097f4981' AND personnel_id = 'bfb7db0c-878a-4ce6-9a77-77bb4a6534d3';

-- Fabio Barboza de Oliveira (Fabio Oliver) in ANCLIVEPA 4 SALAS (Expected 1458.4, Paid 1458.34)
UPDATE personnel_allocations SET event_specific_cache = 350.0016, event_specific_overtime = 29.1668 WHERE event_id = 'c4d6e623-d597-4a20-ad25-61a44e4d3668' AND personnel_id = '9289f051-53a5-4963-8174-10f2777c137a';
