import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.argv[2];
const SERVICE_ROLE_KEY = process.argv[3];
const SQL_CONTENT = `
CREATE OR REPLACE FUNCTION get_events_with_payment_status(p_team_id UUID)
RETURNS TABLE (
  event_id UUID,
  event_name TEXT,
  event_status TEXT,
  end_date DATE,
  payment_due_date DATE,
  allocated_count INT,
  paid_count INT,
  has_pending_payments BOOLEAN
) 
LANGUAGE plpgsql
STABLE SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH 
  freelancers_alocados AS (
    SELECT 
      pa.event_id, 
      pa.personnel_id,
      COALESCE(SUM(COALESCE(pa.event_specific_cache, p.event_cache, 0) * COALESCE(cardinality(pa.work_days), 0)), 0) as theoretical_total
    FROM personnel_allocations pa
    JOIN personnel p ON p.id = pa.personnel_id
    WHERE (p.type IS NULL OR TRIM(LOWER(p.type)) NOT IN ('fixo', 'staff_fixo'))
    GROUP BY pa.event_id, pa.personnel_id
  ),
  dados_pagamento AS (
    SELECT 
      pc.event_id, 
      pc.personnel_id,
      MAX(pc.total_amount) as amount_closed,
      SUM(pc.total_amount_paid) as amount_paid
    FROM payroll_closings pc
    GROUP BY pc.event_id, pc.personnel_id
  ),
  resultados_individuais AS (
    SELECT 
      fa.event_id,
      fa.personnel_id,
      COALESCE(dp.amount_closed, fa.theoretical_total, 0) as expected,
      COALESCE(dp.amount_paid, 0) as paid
    FROM freelancers_alocados fa
    LEFT JOIN dados_pagamento dp ON dp.event_id = fa.event_id AND dp.personnel_id = fa.personnel_id
  )
  SELECT 
    e.id,
    e.name,
    e.status,
    e.end_date,
    e.payment_due_date,
    COALESCE(COUNT(DISTINCT fa.personnel_id)::INT, 0),
    COALESCE(COUNT(DISTINCT CASE WHEN ri.paid >= ri.expected - 0.10 AND ri.expected > 0 THEN fa.personnel_id END)::INT, 0),
    COALESCE(BOOL_OR(ri.expected > ri.paid + 0.10), FALSE)
  FROM events e
  LEFT JOIN freelancers_alocados fa ON fa.event_id = e.id
  LEFT JOIN resultados_individuais ri ON ri.event_id = e.id AND ri.personnel_id = fa.personnel_id
  WHERE e.team_id = p_team_id
  GROUP BY e.id, e.name, e.status, e.end_date, e.payment_due_date
  ORDER BY e.end_date DESC NULLS LAST;
END;
$$;
`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
    console.log('Tentando executar SQL via RPC...');

    // Tenta padrões comuns de RPC para execução de SQL
    const rpcNames = ['exec_sql', 'run_sql', 'execute_sql'];

    for (const name of rpcNames) {
        console.log(`Testando RPC: ${name}`);
        const { data, error } = await supabase.rpc(name, { sql: SQL_CONTENT });

        if (!error) {
            console.log(`Sucesso com RPC: ${name}`);
            console.log(data);
            process.exit(0);
        }

        console.log(`Erro com RPC ${name}: ${error.message}`);
    }

    console.error('Nenhum RPC de execução de SQL encontrado ou permitido.');
    process.exit(1);
}

run();
