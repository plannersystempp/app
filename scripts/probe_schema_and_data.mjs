import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';

const SUPABASE_URL = "https://atogozlqfwxztjyycjoy.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4";

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const log = [];
const L = (msg) => log.push(msg);

async function run() {
    const { data: teams } = await supabase.from('teams').select('id, name').limit(5);
    const teamId = teams?.[0]?.id;
    L(`Team: ${teams?.[0]?.name} (${teamId})`);

    // Schema check
    const { data: paRow } = await supabase.from('personnel_allocations').select('*').limit(1);
    L(`\nPA columns: ${JSON.stringify(Object.keys(paRow?.[0] || {}))}`);

    const { data: pfRow } = await supabase.from('personnel_functions').select('*').limit(1);
    L(`PF columns: ${JSON.stringify(Object.keys(pfRow?.[0] || {}))}`);

    // RPC test
    const { data: rpcData, error: rpcErr } = await supabase.rpc('get_events_with_payment_status', { p_team_id: teamId });
    if (rpcErr) L(`\nRPC ERROR: ${JSON.stringify(rpcErr)}`);
    else {
        L(`\nRPC returned ${rpcData?.length} events:`);
        for (const e of (rpcData || [])) {
            L(`  "${e.event_name}": alloc=${e.allocated_count} paid=${e.paid_count} pending=${e.has_pending_payments}`);
        }
    }

    // Manual calc per event
    const { data: events } = await supabase.from('events').select('id, name').eq('team_id', teamId);

    for (const event of (events || [])) {
        const { data: allocations } = await supabase
            .from('personnel_allocations')
            .select('id, personnel_id, work_days, event_specific_cache')
            .eq('event_id', event.id);

        if (!allocations || allocations.length === 0) continue;

        const personIds = [...new Set(allocations.map(a => a.personnel_id))];
        const { data: personnel } = await supabase
            .from('personnel')
            .select('id, name, type, event_cache, overtime_rate')
            .in('id', personIds);

        const { data: closings } = await supabase
            .from('payroll_closings')
            .select('personnel_id, total_amount_paid')
            .eq('event_id', event.id);

        const { data: workRecords } = await supabase
            .from('work_records')
            .select('employee_id, overtime_hours, work_date, attendance_status')
            .eq('event_id', event.id);

        const { data: ppPayments } = await supabase
            .from('personnel_payments')
            .select('personnel_id, amount, related_events, payment_status')
            .eq('payment_status', 'paid')
            .contains('related_events', [event.id]);

        L(`\nEvent: "${event.name}"`);
        const personnelMap = new Map();
        (personnel || []).forEach(p => personnelMap.set(p.id, p));

        const allocByPerson = new Map();
        allocations.forEach(a => {
            if (!allocByPerson.has(a.personnel_id)) allocByPerson.set(a.personnel_id, []);
            allocByPerson.get(a.personnel_id).push(a);
        });

        let totalAllocated = 0, totalPaidCount = 0, hasPending = false;

        for (const [personId, personAllocs] of allocByPerson) {
            const person = personnelMap.get(personId);
            if (!person || person.type === 'fixo') continue;

            const uniqueDays = new Set();
            for (const alloc of personAllocs) (alloc.work_days || []).forEach(d => uniqueDays.add(d));

            const absentDates = new Set();
            (workRecords || []).filter(wr => wr.employee_id === personId && wr.attendance_status === 'absent')
                .forEach(wr => { if (wr.work_date) absentDates.add(wr.work_date); });
            for (const ad of absentDates) uniqueDays.delete(ad);
            const workedDays = uniqueDays.size;

            const specificRates = personAllocs.map(a => a.event_specific_cache || 0).filter(r => r > 0);
            const dailyCache = specificRates.length > 0 ? Math.max(...specificRates) : (person.event_cache || 0);

            const overtimeHours = (workRecords || [])
                .filter(wr => wr.employee_id === personId)
                .reduce((sum, wr) => sum + (wr.overtime_hours || 0), 0);

            const explicitRate = person.overtime_rate || 0;
            const implicitRate = dailyCache > 0 ? dailyCache / 12 : 0;
            const overtimeRate = Math.max(explicitRate, implicitRate);

            const expected = (workedDays * dailyCache) + (overtimeHours * overtimeRate);

            const closingsPaid = (closings || []).filter(c => c.personnel_id === personId).reduce((s, c) => s + (c.total_amount_paid || 0), 0);
            const ppPaid = (ppPayments || []).filter(pp => pp.personnel_id === personId).reduce((s, pp) => {
                const evtCount = (pp.related_events || []).length || 1;
                return s + (pp.amount / evtCount);
            }, 0);
            const paidAmount = closingsPaid + ppPaid;

            totalAllocated++;
            const isPaid = paidAmount >= expected - 0.10;
            if (isPaid) totalPaidCount++;
            if (expected > paidAmount + 0.10) hasPending = true;

            L(`  ${person.name}: days=${workedDays} cache=${dailyCache} OT=${overtimeHours}h rate=${overtimeRate.toFixed(2)} expected=${expected.toFixed(2)} paid=${paidAmount.toFixed(2)} isPaid=${isPaid}`);
        }
        L(`  => alloc=${totalAllocated} paid=${totalPaidCount} pending=${hasPending}`);
    }

    fs.writeFileSync('scripts/probe_result.txt', log.join('\n'), 'utf8');
    console.log('Done - output written to scripts/probe_result.txt');
}

run();
