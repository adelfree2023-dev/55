// Set dummy env vars for Zod validation in @apex/config
process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.JWT_SECRET = 'test-secret';
process.env.MINIO_ENDPOINT = 'localhost';
process.env.MINIO_ACCESS_KEY = 'minio';
process.env.MINIO_SECRET_KEY = 'minio123';

import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';

// Mock Pool and setSchemaPath
jest.mock('pg', () => {
    return {
        Pool: jest.fn().mockImplementation(() => ({
            query: jest.fn(),
        })),
    };
});

jest.mock('@apex/db', () => ({
    setSchemaPath: jest.fn(),
}));

describe('TenantMiddleware', () => {
    let middleware: any;
    let mockPoolInstance: any;
    let setSchemaPath: any;

    beforeEach(async () => {
        const { Pool } = require('pg');
        const dbPkg = require('@apex/db');
        setSchemaPath = dbPkg.setSchemaPath;

        const middlewareModule = require('./tenant.middleware');

        const module: TestingModule = await Test.createTestingModule({
            providers: [middlewareModule.TenantMiddleware],
        }).compile();

        middleware = module.get(middlewareModule.TenantMiddleware);
        mockPoolInstance = (middleware as any).pool;
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(middleware).toBeDefined();
    });

    it('should throw BadRequestException if X-Tenant-Id header is missing', async () => {
        const req: any = { headers: {} };
        const res: any = {};
        const next = jest.fn();

        await expect(middleware.use(req, res, next)).rejects.toThrow(BadRequestException);
    });

    it('should set schema path and call next if tenant is found', async () => {
        const req: any = { headers: { 'x-tenant-id': 'test-tenant' } };
        const res: any = {};
        const next = jest.fn();

        mockPoolInstance.query.mockResolvedValueOnce({
            rows: [{ id: 'uuid-123' }],
        });
        (setSchemaPath as jest.Mock).mockResolvedValueOnce(undefined);

        await middleware.use(req, res, next);

        expect(mockPoolInstance.query).toHaveBeenCalledWith(
            'SELECT id FROM public.tenants WHERE subdomain = $1 LIMIT 1',
            ['test-tenant']
        );
        expect(setSchemaPath).toHaveBeenCalledWith('uuid-123');
        expect(next).toHaveBeenCalled();
    });

    it('should throw BadRequestException if tenant is not found', async () => {
        const req: any = { headers: { 'x-tenant-id': 'non-existent' } };
        const res: any = {};
        const next = jest.fn();

        mockPoolInstance.query.mockResolvedValueOnce({ rows: [] });

        await expect(middleware.use(req, res, next)).rejects.toThrow(BadRequestException);
    });
});
