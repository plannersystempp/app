
import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://atogozlqfwxztjyycjoy.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4');

async function checkUser() {
  const targetId = '27c1eb30-940c-4312-807a-8fc446a748b9';
  const teamId = '5a4a57c2-431c-46e0-95c4-14cde1b4a9a9';

  console.log(`Checking RPC for user ${targetId} in team ${teamId}...`);
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_personnel_with_functions', { p_team_id: teamId });
  
  if (rpcError) {
    console.error('Error calling RPC:', rpcError);
    return;
  }

  const user = rpcData.find((p: any) => p.id === targetId);
  if (user) {
    console.log('User found in RPC response.');
    console.log('Functions:', JSON.stringify(user.functions, null, 2));
  } else {
    console.log('User NOT found in RPC response.');
  }
}

checkUser();
