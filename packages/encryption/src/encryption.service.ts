import { Injectable, Logger } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

@Injectable()
export class EncryptionService {
    private readonly logger = new Logger(EncryptionService.name);
    private readonly keyPromise: Promise<Buffer>;

    constructor() {
        // Derive key from JWT_SECRET (must be 32+ chars per S1)
        this.keyPromise = this.deriveKey(process.env.JWT_SECRET || '');
    }

    private async deriveKey(password: string): Promise<Buffer> {
        const salt = Buffer.from(password.slice(0, SALT_LENGTH).padEnd(SALT_LENGTH, '0'));
        const key = await promisify(scrypt)(password, salt, 32) as Buffer;
        return key;
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
