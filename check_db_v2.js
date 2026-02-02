const postgres = require('postgres');

async function getTenants() {
    // Verified from docker-compose.yml
    const sql = postgres('postgresql://apex:apex2026@localhost:5432/apex');

    try {
        console.log('🔄 Fetching tenants from PRODUCTION database...');
        const tenants = await sql`
            SELECT id, subdomain, name, status, deleted_at 
            FROM public.tenants
        `;

        console.log('\n--- REAL-TIME TENANT REPORT ---');
        console.table(tenants);
        console.log('-------------------------------\n');

        const demo = tenants.find(t => t.subdomain === 'demo-store');
        if (demo) {
            console.log('📍 FOCUS: demo-store');
            console.log(`Status: ${demo.status}`);
            console.log(`Deleted At: ${demo.deleted_at}`);
        } else {
            console.log('❌ demo-store NOT FOUND in database!');
        }

    } catch (err) {
        console.error('❌ Database Connection Failed:', err.message);
        console.log('\nTry checking if Docker is running and if the port 5432 is exposed.');
    } finally {
        await sql.end();
    }
}

getTenants();
