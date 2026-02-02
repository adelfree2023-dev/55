const { Pool } = require('pg');

async function checkTenants() {
    const pool = new Pool({
        connectionString: 'postgresql://postgres:postgres@localhost:5432/postgres'
    });

    try {
        const res = await pool.query('SELECT id, subdomain, name, status, deleted_at FROM public.tenants');
        console.log('--- TENANT REPORT ---');
        console.table(res.rows);
        console.log('---------------------');
    } catch (err) {
        console.error('Error querying DB:', err.message);
    } finally {
        await pool.end();
    }
}

checkTenants();
