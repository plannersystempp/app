-- Adiciona coluna para ocultar planos da listagem pública
ALTER TABLE subscription_plans
ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- Índice opcional para consultas por visibilidade
CREATE INDEX IF NOT EXISTS idx_subscription_plans_is_hidden ON subscription_plans(is_hidden);

