import fs from 'node:fs';

const SUPABASE_URL = "https://atogozlqfwxztjyycjoy.supabase.co";
const SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0b2dvemxxZnd4enRqeXljam95Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDEwNDcyOSwiZXhwIjoyMDY1NjgwNzI5fQ.hbTM0BdE7feollHvF4R3TjWydDRsSVdhydjTfTT0Iy4";

const sqlFile = fs.readFileSync('supabase/migrations/20260304100000_fix_rpc_column_reference.sql', 'utf8');

// Use the Supabase REST API to execute SQL via the pg-meta endpoint
// The service_role key has admin access
async function executeSql(sql) {
    // Try the /rest/v1/rpc approach with a pg function first
    // But since we can't call raw SQL via REST, we'll use the pg-meta API

    const projectRef = 'atogozlqfwxztjyycjoy';

    // Method: Use the Supabase SQL endpoint (requires service_role)
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({})
    });

    console.log('Direct SQL execution is not available via REST API.');
    console.log('The SQL needs to be executed in the Supabase SQL Editor.');
    console.log('');
    console.log('However, let me try an alternative approach...');

    // Alternative: Use the postgres connection string via pg
    // This won't work without pg module, so let's try the management API

    // Try the v1 SQL endpoint
    const sqlResponse = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: sql })
    });

    console.log('Management API response:', sqlResponse.status, sqlResponse.statusText);
    if (sqlResponse.ok) {
        const data = await sqlResponse.json();
        console.log('Result:', JSON.stringify(data, null, 2));
        return true;
    } else {
        const text = await sqlResponse.text();
        console.log('Error body:', text);
        return false;
    }
}

executeSql(sqlFile);
