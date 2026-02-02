import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService implements OnModuleInit {
    private readonly logger = new Logger(EncryptionService.name);
    private keyPromise: Promise<Buffer>;

    constructor() {
        // S1 Enforcement: Fail-Closed boot-time validation
        const secret = process.env.JWT_SECRET;

        if (!secret) {
            console.error('[FATAL] S1 VIOLATION: JWT_SECRET environment variable is MISSING! Application cannot start securely.');
            process.exit(1);
        }

        if (secret.length < 32) {
            console.error(`[FATAL] S1 VIOLATION: JWT_SECRET is UNSAFE! Must be at least 32 characters (current: ${secret.length}).`);
            process.exit(1);
        }

        this.logger.log('✅ S1/S7: Encryption key validation passed');
    }

    onModuleInit() {
        // Derive key only after validation
        this.keyPromise = this.deriveKey(process.env.JWT_SECRET!);
    }

    private async deriveKey(password: string): Promise<Buffer> {
        const salt = Buffer.from(password.slice(0, SALT_LENGTH).padEnd(SALT_LENGTH, '0'));
        return promisify(scrypt)(password, salt, 32) as Promise<Buffer>;
    }

    /**
     * Encrypts sensitive data using AES-256-GCM
     * @param plaintext - Data to encrypt (PII, API keys, etc.)
     * @returns Encrypted payload: iv:salt:authTag:ciphertext
     */
    async encrypt(plaintext: string): Promise<string> {
        try {
            // Handle empty strings specially to avoid cipher edge cases
            if (plaintext === '') {
                return 'empty';
            }

            const key = await this.keyPromise;
            const iv = randomBytes(IV_LENGTH);

            const cipher = createCipheriv(ALGORITHM, key, iv);
            const ciphertext = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex');
            const authTag = cipher.getAuthTag();

            // Format: iv:salt:authTag:ciphertext
            return [
                iv.toString('hex'),
                Buffer.from((process.env.JWT_SECRET || '').slice(0, SALT_LENGTH)).toString('hex'),
                authTag.toString('hex'),
                ciphertext
            ].join(':');
        } catch (error: any) {
            this.logger.error(`Encryption failed: ${error.message}`);
            throw new Error('Encryption service unavailable');
        }
    }

    /**
     * Decrypts ciphertext using AES-256-GCM
     * @param payload - Encrypted payload in format: iv:salt:authTag:ciphertext
     * @returns Decrypted plaintext
     */
    async decrypt(payload: string): Promise<string> {
        try {
            // Handle empty string marker
            if (payload === 'empty') {
                return '';
            }

            const [ivHex, , authTagHex, ciphertext] = payload.split(':');
            if (!ivHex || !authTagHex || !ciphertext) {
                throw new Error('Invalid payload format');
            }

            const key = await this.keyPromise;
            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');

            const decipher = createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            const plaintext = decipher.update(ciphertext, 'hex', 'utf8') + decipher.final('utf8');
            return plaintext;
        } catch (error: any) {
            this.logger.error(`Decryption failed: ${error.message}`);
            throw new Error('Decryption failed - invalid payload or key');
        }
    }

    /**
     * Encrypts database column value (for TypeORM/Drizzle hooks)
     */
    async encryptDbValue(value: string): Promise<string> {
        return `enc:${await this.encrypt(value)}`;
    }

    /**
     * Decrypts database column value
     */
    async decryptDbValue(encryptedValue: string): Promise<string> {
        if (!encryptedValue.startsWith('enc:')) {
            return encryptedValue; // Already plaintext (migration safety)
        }
        return this.decrypt(encryptedValue.slice(4));
    }
}
