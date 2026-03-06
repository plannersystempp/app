
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://atogozlqfwxztjyycjoy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPersonnel() {
  const { data, error } = await supabase
    .from('personnel')
    .select('id, name')
    .or('name.ilike.%Luiz Henrique de Oliveira Rodrigues%,name.ilike.%Paulo Henrique Soares da Silva%');
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

findPersonnel();
