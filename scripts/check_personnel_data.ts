
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://atogozlqfwxztjyycjoy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key-placeholder'; // We need the key, let's hope it's in env or I can get it from previous tool output

// I'll assume the environment variables are available or I need to hardcode them from the `supabase_get_project` output I got earlier.
// Service role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4
// Url: https://atogozlqfwxztjyycjoy.supabase.co

const supabase = createClient('https://atogozlqfwxztjyycjoy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4');

async function checkData() {
  console.log('Checking personnel_functions data...');
  const { data: pfData, error: pfError } = await supabase
    .from('personnel_functions')
    .select('*')
    .not('custom_cache', 'is', null)
    .limit(5);

  if (pfError) {
    console.error('Error fetching personnel_functions:', pfError);
  } else {
    console.log('Personnel Functions with custom_cache:', pfData);
  }

  // Now check RPC
  // Need a team_id from the data above or any team
  const { data: teams } = await supabase.from('teams').select('id').limit(1);
  if (teams && teams.length > 0) {
    const teamId = teams[0].id;
    console.log(`Checking RPC for team ${teamId}...`);
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_personnel_with_functions', { p_team_id: teamId });
    
    if (rpcError) {
      console.error('Error calling RPC:', rpcError);
    } else {
      // Find one with functions
      const withFuncs = rpcData.find((p: any) => p.functions && p.functions.length > 0);
      if (withFuncs) {
        console.log('RPC Sample Data:', JSON.stringify(withFuncs.functions, null, 2));
      } else {
        console.log('No personnel with functions found in RPC response');
      }
    }
  }
}

checkData();
