
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env vars. Please run with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY set.');
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

(async () => {
  // 1. Check if we can connect at all
  const { count, error: countError } = await sb.from('personnel').select('*', { count: 'exact', head: true });
  if (countError) {
      console.error('Connection error:', countError);
      return;
  }
  console.log('Total personnel:', count);

  const { data: p, error } = await sb
    .from('personnel')
    .select('id, name, event_cache')
    .limit(5);

  if (error) {
    console.error('Error fetching person:', error);
    return;
  }
  
  const person = Array.isArray(p) ? p[0] : p;
  console.log('Person:', person);

  if (!person) return;

  // 1. Allocations
  const { data: allocations, error: allocError } = await sb
    .from('personnel_allocations')
    .select(`
      id, 
      event_id, 
      function_name, 
      function_id, 
      event_specific_cache, 
      work_days,
      events!inner(name)
    `)
    .eq('personnel_id', person.id)
    .eq('events.name', 'Evento Teste QA');

  if (allocError) {
      console.error('Error fetching allocations:', allocError);
  }
  console.log('Allocations:', JSON.stringify(allocations, null, 2));

  // 2. Personnel Functions
  const { data: functions, error: funcError } = await sb
    .from('personnel_functions')
    .select(`
      function_id,
      custom_cache,
      custom_overtime,
      is_primary,
      functions:function_id(id, name)
    `)
    .eq('personnel_id', person.id);
    
  if (funcError) {
      console.error('Error fetching functions:', funcError);
  }
  console.log('Personnel Functions:', JSON.stringify(functions, null, 2));
})();
