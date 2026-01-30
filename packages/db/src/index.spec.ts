import { describe, it, expect, mock } from 'bun:test';
import { createTenantSchema, setSchemaPath, client, db } from './index';

describe('DB Core Utils (Packages/DB)', () => {
    it('should create tenant schema with quoted identifier', async () => {
        const executeMock = mock(() => Promise.resolve());
        (db as any).execute = executeMock;

        const schemaName = await createTenantSchema('test-tenant');

        expect(schemaName).toBe('tenant_test-tenant');
        expect(executeMock).toHaveBeenCalledWith(expect.stringContaining('CREATE SCHEMA IF NOT EXISTS "tenant_test-tenant"'));
    });

    it('should set search path with quoted identifier', async () => {
        const executeMock = mock(() => Promise.resolve());
        (db as any).execute = executeMock;

        await setSchemaPath('test-tenant');

        expect(executeMock).toHaveBeenCalledWith(expect.stringContaining('SET search_path TO "tenant_test-tenant", public'));
    });
});
