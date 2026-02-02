import { Injectable, Logger, UnauthorizedException, Inject, Optional } from '@nestjs/common';
import * as crypto from 'crypto';
import { Pool } from 'pg';
import { env } from '@apex/config';

@Injectable()
export class IdentityService {
    private readonly logger = new Logger(IdentityService.name);
    private readonly jwtSecret = env.JWT_SECRET;
    private readonly appSecret = process.env.APP_SECRET || env.JWT_SECRET;

    constructor(
        @Optional()
        @Inject('DATABASE_POOL')
        private readonly pool: Pool = new Pool({ connectionString: env.DATABASE_URL })
    ) { }

    /**
     * Centralized Login Logic
     */
    async login(email: string, password: string, tenantId?: string) {
        let query = 'SELECT * FROM public.users WHERE email = $1';
        const params = [email];

        if (tenantId) {
            query += ' AND tenant_id = $2';
            params.push(tenantId);
        } else {
            query += ' AND tenant_id IS NULL';
        }

        const result = await this.pool.query(query, params);
        const user = result.rows[0];

        if (!user || !user.is_verified) {
            this.logger.warn(`Failed login attempt for ${email} (User not found or not verified)`);
            throw new UnauthorizedException('Invalid credentials or account not verified');
        }

        const isPasswordValid = await this.comparePassword(password, user.password_hash);
        if (!isPasswordValid) {
            this.logger.warn(`Failed login attempt for ${email} (Invalid password)`);
            throw new UnauthorizedException('Invalid credentials');
        }

        // Generate Token with Security Context
        const token = this.generateJwt({
            sub: user.id,
            email: user.email,
            role: user.role,
            tenantId: user.tenant_id,
            securityVersion: user.security_version
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                tenantId: user.tenant_id
            }
        };
    }

    /**
     * Hash password using Scrypt
     */
    async hashPassword(password: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const salt = crypto.randomBytes(16).toString('hex');
            crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                if (err) reject(err);
                resolve(`${salt}:${derivedKey.toString('hex')}`);
            });
        });
    }

    /**
     * Compare password with hash
     */
    async comparePassword(password: string, storedHash: string): Promise<boolean> {
        const [salt, hash] = storedHash.split(':');
        if (!salt || !hash) return false;

        return new Promise((resolve, reject) => {
            crypto.scrypt(password, salt, 64, (err, derivedKey) => {
                if (err) reject(err);
                resolve(derivedKey.toString('hex') === hash);
            });
        });
    }

    /**
     * Generate JWT using HMAC-SHA256
     */
    generateJwt(payload: any): string {
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const p = Buffer.from(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000) })).toString('base64url');
        const signature = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${p}`).digest('base64url');
        return `${header}.${p}.${signature}`;
    }

    /**
     * Verify JWT
     */
    verifyJwt(token: string): any {
        try {
            const [header, payload, signature] = token.split('.');
            if (!header || !payload || !signature) return null;

            const expectedSignature = crypto.createHmac('sha256', this.jwtSecret).update(`${header}.${payload}`).digest('base64url');
            if (signature !== expectedSignature) return null;

            return JSON.parse(Buffer.from(payload, 'base64url').toString());
        } catch (error) {
            this.logger.error(`JWT Verification failed: ${error.message}`);
            return null;
        }
    }

    /**
     * Generate Verification Token and Store Hash
     */
    async requestVerification(userId: string) {
        const token = crypto.randomBytes(32).toString('hex');
        const hash = this.generateVerificationHash(token);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // 24h expiry

        await this.pool.query(
            'UPDATE public.users SET verification_token_hash = $1, verification_expires_at = $2 WHERE id = $3',
            [hash, expiresAt, userId]
        );

        return token;
    }

    /**
     * Verify Token and Activate User
     */
    async verifyEmail(token: string) {
        const hash = this.generateVerificationHash(token);

        const result = await this.pool.query(
            `SELECT id, tenant_id FROM public.users 
             WHERE verification_token_hash = $1 AND verification_expires_at > NOW() AND is_verified = false`,
            [hash]
        );

        const user = result.rows[0];
        if (!user) {
            throw new UnauthorizedException('Invalid or expired verification token');
        }

        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // 1. Activate User
            await client.query(
                'UPDATE public.users SET is_verified = true, verification_token_hash = NULL, verification_expires_at = NULL WHERE id = $1',
                [user.id]
            );

            // 2. Activate Tenant
            if (user.tenant_id) {
                await client.query(
                    "UPDATE public.tenants SET status = 'active' WHERE id = $1",
                    [user.tenant_id]
                );
            }

            await client.query('COMMIT');
            return { success: true };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    /**
     * Generate HMAC for verification tokens
     */
    generateVerificationHash(token: string): string {
        return crypto.createHmac('sha256', this.appSecret).update(token).digest('hex');
    }

    /**
     * Verify HMAC token
     */
    verifyVerificationHash(token: string, hash: string): boolean {
        const expectedHash = this.generateVerificationHash(token);
        try {
            return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expectedHash));
        } catch {
            return false;
        }
    }
}
