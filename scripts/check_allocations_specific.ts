
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://atogozlqfwxztjyycjoy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAllocations() {
  const personnelIds = [
    'f7fd30df-20ca-4ba6-aa4f-b8f5f61154d1', // Paulo
    '4e5ef7a1-30b2-494c-bf65-8cf5b93aed9e'  // Luiz
  ];

  const { data, error } = await supabase
    .from('personnel_allocations')
    .select(`
      id, 
      event_id, 
      personnel_id, 
      event_specific_cache, 
      event_specific_overtime,
      events (name)
    `)
    .in('personnel_id', personnelIds);
  
  if (error) console.error(error);
  else console.log(JSON.stringify(data, null, 2));
}

checkAllocations();
