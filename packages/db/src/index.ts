import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@apex/config";

export const client = postgres(env.DATABASE_URL);
export const db = drizzle(client);

export async function createTenantSchema(tenantId: string) {
    const schemaName = `tenant_${tenantId}`;
    await db.execute(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
    return schemaName;
}

export async function setSchemaPath(tenantId: string) {
    await db.execute(`SET search_path TO "tenant_${tenantId}", public`);
}

export * from "drizzle-orm";
export * from "./schema/audit-logs";
export * from "./schema/tenants";
