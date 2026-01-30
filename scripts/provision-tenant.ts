// Tenant Provisioning Script Placeholder
import { db, createTenantSchema, setSchemaPath } from "../packages/db/src/index";

async function provisionTenant(name: string, email: string) {
    const startTime = Date.now();
    console.log(`🚀 Starting Provisioning Flow for: ${name}...`);

    try {
        // 1. Create Schema Isolation (S2)
        const schemaName = await createTenantSchema(name);
        console.log(`✅ Schema created: ${schemaName}`);

        // 2. Set context and Seed starter data
        await setSchemaPath(name);
        // TODO: In a real app, we'd run migrations or seed tables here
        // For now, we simulate the DB setup
        await db.execute(`CREATE TABLE IF NOT EXISTS ${schemaName}.settings (key TEXT PRIMARY KEY, value TEXT)`);
        await db.execute(`INSERT INTO ${schemaName}.settings (key, value) VALUES ('store_name', '${name}')`);
        console.log(`✅ Starter data seeded for ${schemaName}`);

        // 3. Register in Public Tenants (Audit S4)
        await db.execute(`
      INSERT INTO public.tenants (name, subdomain, owner_email)
      VALUES ('${name}', '${name}', '${email}')
      ON CONFLICT (subdomain) DO NOTHING
    `);

        await db.execute(`
      INSERT INTO public.audit_logs (user_id, action, tenant_id)
      VALUES ('system', 'TENANT_PROVISIONED', '${name}')
    `);

        const duration = (Date.now() - startTime) / 1000;
        console.log(`\n✨ Provisioning Complete in ${duration.toFixed(2)}s!`);

        if (duration > 55) {
            console.warn("⚠️ WARNING: Provisioning exceeded 55s threshold (Pillar 3 Violation)");
        } else {
            console.log("🎯 North Star Goal Met: < 55s");
        }

    } catch (error) {
        console.error("❌ Provisioning Failed:", error);
        process.exit(1);
    }
}

const args = process.argv.slice(2);
const storeName = args.find(a => a.startsWith("--store-name="))?.split("=")[1];
const ownerEmail = args.find(a => a.startsWith("--owner-email="))?.split("=")[1];

if (storeName && ownerEmail) {
    provisionTenant(storeName, ownerEmail);
} else {
    console.log("❌ Missing arguments. Usage: bun run provision --store-name='myshop' --owner-email='user@example.com'");
}
