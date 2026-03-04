import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://atogozlqfwxztjyycjoy.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4";

// Team ID do screenshot/uso comum
const TEST_TEAM_ID = "63d76b1f-7401-49b0-8c29-371424ef24cd"; // Exemplo, vamos tentar pegar do banco se falhar

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function run() {
    console.log('Testando RPC get_events_with_payment_status...');

    // Tenta listar equipes primeiro para ter um ID válido caso o teste falhe
    const { data: teams } = await supabase.from('teams').select('id').limit(1);
    const teamId = teams?.[0]?.id || TEST_TEAM_ID;

    console.log(`Usando Team ID: ${teamId}`);

    const { data, error } = await supabase.rpc('get_events_with_payment_status', { p_team_id: teamId });

    if (error) {
        console.error('ERRO DETALHADO:');
        console.error(JSON.stringify(error, null, 2));
        process.exit(1);
    }

    console.log('SUCESSO!');
    console.log(`Retornou ${data.length} eventos.`);
    if (data.length > 0) {
        console.log('Amostra do primeiro evento:');
        console.log(JSON.stringify(data[0], null, 2));
    }
    process.exit(0);
}

run();
