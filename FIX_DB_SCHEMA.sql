-- FIX: Adiciona colunas de horário na tabela personnel_allocations
-- Data: 2026-01-28
-- Autor: Trae (Principal Software Architect)
-- Descrição: O frontend espera poder salvar start_time e end_time, mas estas colunas não existem no banco.

-- Adiciona coluna start_time se não existir
ALTER TABLE personnel_allocations 
ADD COLUMN IF NOT EXISTS start_time text;

-- Adiciona coluna end_time se não existir
ALTER TABLE personnel_allocations 
ADD COLUMN IF NOT EXISTS end_time text;

-- Comentário para documentação no banco
COMMENT ON COLUMN personnel_allocations.start_time IS 'Horário de início da alocação (formato HH:MM)';
COMMENT ON COLUMN personnel_allocations.end_time IS 'Horário de fim da alocação (formato HH:MM)';
