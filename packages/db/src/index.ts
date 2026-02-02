import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@apex/config";

export const client = postgres(env.DATABASE_URL, { max: 100 });
export const db = drizzle(client);

export async function createTenantSchema(tenantId: string) {
    if (!/^[a-z0-9-]+$/.test(tenantId)) {
        throw new Error('Invalid tenant ID format');
    }
    const schemaName = `tenant_${tenantId}`;
    await db.execute(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    return schemaName;
}

export async function setSchemaPath(tenantId: string) {
    if (!/^[a-z0-9-]+$/.test(tenantId)) {
        throw new Error('Invalid tenant ID format');
    }
    // WARNING: This sets search_path on the GLOBAL pool connection if client is not scoped.
    // Use with extreme caution or prefer request-scoped clients.
    await db.execute(`SET search_path TO "tenant_${tenantId}", public`);
}

// NEVER use this directly in services - only in middleware with new client
export async function setSchemaPathUnsafe(schemaName: string) {
    if (!/^[a-z0-9_]+$/.test(schemaName)) {
        throw new Error('Invalid schema name - SQL injection risk');
    }
    await db.execute(sql.raw(`SET search_path TO "${schemaName}", public`));
}

// SAFE alternative: Services should ALWAYS qualify table names
export function tenantTable(tenantId: string, tableName: string): string {
    return `"tenant_${tenantId}".${tableName}`;
}

import { sql } from "drizzle-orm"; // Ensure sql is imported
export * from "drizzle-orm";
export * from "./schema/audit-logs";
export * from "./schema/tenants";
