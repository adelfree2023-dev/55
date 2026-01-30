import { describe, it, expect, beforeEach } from 'bun:test';
import { EncryptionService } from './encryption.service';

describe('EncryptionService (Arch-S7)', () => {
    let service: EncryptionService;
    const testSecret = 'super-secret-key-for-apex-v2-encryption-test-2026-length-ok';

    beforeEach(() => {
        // Mock env before service instantiation
        process.env.JWT_SECRET = testSecret;
        service = new EncryptionService();
    });

    it('should encrypt and decrypt sensitive data correctly', async () => {
        const original = 'sk_test_1234567890_secret_api_key';
        const encrypted = await service.encrypt(original);

        expect(encrypted).toContain(':');
        expect(encrypted.split(':')).toHaveLength(4);
        expect(encrypted).not.toContain(original);

        const decrypted = await service.decrypt(encrypted);
        expect(decrypted).toBe(original);
    });

    it('should handle PII data securely', async () => {
        const pii = 'user@example.com';
        const encrypted = await service.encryptDbValue(pii);

        expect(encrypted).toMatch(/^enc:[a-f0-9:]+$/);
        expect(encrypted).not.toContain('@');

        const decrypted = await service.decryptDbValue(encrypted);
        expect(decrypted).toBe(pii);
    });

    it('should reject invalid payload format', async () => {
        await expect(service.decrypt('invalid')).rejects.toThrow();
        await expect(service.decrypt('a:b:c')).rejects.toThrow();
    });

    it('should maintain backward compatibility with plaintext', async () => {
        const plaintext = 'already_plaintext';
        const decrypted = await service.decryptDbValue(plaintext);
        expect(decrypted).toBe(plaintext);
    });

    it('should handle special characters correctly', async () => {
        const special = 'Passw0rd!@#$%^&*()_+{}|:"<>?';
        const encrypted = await service.encrypt(special);
        const decrypted = await service.decrypt(encrypted);
        expect(decrypted).toBe(special);
    });

    it('should handle empty strings', async () => {
        const empty = '';
        const encrypted = await service.encrypt(empty);
        const decrypted = await service.decrypt(encrypted);
        expect(decrypted).toBe(empty);
    });

    it('should fail decryption if payload is tampered', async () => {
        const original = 'secret';
        const encrypted = await service.encrypt(original);
        const parts = encrypted.split(':');
        parts[3] = 'tampered' + parts[3]; // Change ciphertext
        const tampered = parts.join(':');

        await expect(service.decrypt(tampered)).rejects.toThrow('Decryption failed');
    });

    it('should fail decryption if secret changes', async () => {
        const original = 'secret';
        const encrypted = await service.encrypt(original);

        // Change secret and re-instantiate service
        process.env.JWT_SECRET = 'different-secret-different-secret-32';
        const newService = new EncryptionService();

        await expect(newService.decrypt(encrypted)).rejects.toThrow('Decryption failed');
    });

    it('should produce different ciphertexts for same plaintext', async () => {
        const plaintext = 'test-data';
        const encrypted1 = await service.encrypt(plaintext);
        const encrypted2 = await service.encrypt(plaintext);

        expect(encrypted1).not.toBe(encrypted2); // Different IVs
        expect(await service.decrypt(encrypted1)).toBe(plaintext);
        expect(await service.decrypt(encrypted2)).toBe(plaintext);
    });
});
