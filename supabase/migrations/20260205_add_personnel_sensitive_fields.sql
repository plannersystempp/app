-- Adicionar colunas para dados pessoais sensíveis
ALTER TABLE personnel 
ADD COLUMN IF NOT EXISTS rg text,
ADD COLUMN IF NOT EXISTS cpf text,
ADD COLUMN IF NOT EXISTS mothers_name text,
ADD COLUMN IF NOT EXISTS birth_date date;

-- Comentários para documentação
COMMENT ON COLUMN personnel.rg IS 'Registro Geral (RG) do profissional';
COMMENT ON COLUMN personnel.cpf IS 'Cadastro de Pessoas Físicas (CPF)';
COMMENT ON COLUMN personnel.mothers_name IS 'Nome completo da mãe';
COMMENT ON COLUMN personnel.birth_date IS 'Data de nascimento';
