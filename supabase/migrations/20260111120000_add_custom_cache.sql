-- Adiciona coluna custom_cache na tabela de relacionamento personnel_functions
-- Isso permite definir um valor de cachê específico para cada função de um freelancer
ALTER TABLE personnel_functions 
ADD COLUMN IF NOT EXISTS custom_cache NUMERIC DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN personnel_functions.custom_cache IS 'Valor de cachê específico para esta função. Se nulo, usa o cachê padrão do freelancer.';
