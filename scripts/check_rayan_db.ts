
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://atogozlqfwxztjyycjoy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase
    .from('personnel_allocations')
    .select('id, event_id, personnel_id, event_specific_cache, event_specific_overtime')
    .eq('event_id', 'ea4e1c35-01e8-4dbc-b72b-3a5a28f1abdb')
    .eq('personnel_id', '03b428e2-486a-4962-8f45-3ac92cc54047');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

check();
