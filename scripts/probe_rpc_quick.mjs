import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const SUPABASE_URL = "https://atogozlqfwxztjyycjoy.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4";
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const log = [];
const L = (msg) => log.push(msg);

async function run() {
    const { data: teams } = await supabase.from('teams').select('id, name').limit(1);
    const teamId = teams?.[0]?.id;
    L(`Team: ${teams?.[0]?.name} (${teamId})`);

    // Test RPC
    L('\n=== RPC TEST ===');
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_events_with_payment_status', { p_team_id: teamId });
    if (rpcErr) {
        L(`RPC STILL FAILING: ${JSON.stringify(rpcErr)}`);
    } else {
        L(`RPC SUCCESS! Returned ${rpcData?.length} events:`);
        for (const e of (rpcData || [])) {
            L(`  "${e.event_name}": alloc=${e.allocated_count} paid=${e.paid_count} pending=${e.has_pending_payments} status=${e.event_status}`);
        }
    }

    fs.writeFileSync('scripts/probe_result.txt', log.join('\n'), 'utf8');
    console.log('Done');
}
run();
