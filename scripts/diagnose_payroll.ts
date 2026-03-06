
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://atogozlqfwxztjyycjoy.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4';

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnose() {
  console.log('Diagnosing payroll discrepancies...');
  
  const { data, error } = await supabase.rpc('get_payroll_discrepancies');

  if (error) {
    console.error('Error calling RPC:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No discrepancies found.');
    return;
  }

  console.log(`Found ${data.length} discrepancies:`);
  console.table(data.map((d: any) => ({
    Event: d.event_name,
    Person: d.person_name,
    Expected: d.expected,
    Paid: d.paid,
    Diff: d.diff,
    Days: d.worked_days,
    OT: d.total_overtime_hours,
    OTRate: d.current_overtime_rate,
    MaxOT: d.debug_max_event_overtime,
    Cache: d.current_cache,
    CachesUsed: d.overtime_caches_used,
    RemainingOT: d.overtime_remaining_hours,
    Convert: d.convert_enabled
  })));

  // Propose fixes
  let sqlContent = '-- Fix historical rates based on paid amounts\n';
  
  for (const d of data) {
    const days = Number(d.worked_days);
    const ot = Number(d.total_overtime_hours);
    const paid = Number(d.paid);
    
    if (days === 0 && ot === 0) continue;

    let divisor = days;
    
    if (d.convert_enabled) {
      divisor += Number(d.overtime_caches_used);
      divisor += Number(d.overtime_remaining_hours) / 12;
    } else {
      divisor += ot / 12;
    }

    let impliedCache = 0;
    if (divisor > 0) {
      impliedCache = paid / divisor;
    }

    // Use more precision for the calculation but maybe 2 decimals is enough for the DB?
    // DB is numeric, so it handles arbitrary precision.
    // But let's stick to 2 decimals for currency, or 4 if we want to be precise about the rate.
    // If I use 4 decimals, I minimize rounding errors in the reverse calculation.
    impliedCache = Math.round(impliedCache * 10000) / 10000;
    const impliedOvertime = Math.round((impliedCache / 12) * 10000) / 10000;

    sqlContent += `\n-- ${d.person_name} in ${d.event_name} (Expected ${d.expected}, Paid ${d.paid})\n`;
    sqlContent += `UPDATE personnel_allocations SET event_specific_cache = ${impliedCache}, event_specific_overtime = ${impliedOvertime} WHERE event_id = '${d.event_id}' AND personnel_id = '${d.personnel_id}';\n`;
  }

  fs.writeFileSync('scripts/fix_rates_final.sql', sqlContent);
  console.log('SQL fix file generated at scripts/fix_rates_final.sql');
}

diagnose();
