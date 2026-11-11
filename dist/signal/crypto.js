/**
 * @license MIT
 * Copyright (c) 2026 Michael (KazeDevID)
 * Pure Native Cryptographic Engine for Kazewa Signal & WhatsApp Handshake
 * Completely standalone using Node.js native `node:crypto`
 */
import crypto from 'node:crypto';
export class KazewaCrypto {
    /**
     * Computes Curve25519 (X25519) Diffie-Hellman shared secret using native node:crypto
     */
    static x25519SharedKey(privateKey32, publicKey32) {
        let priv = Buffer.from(privateKey32);
        let pub = Buffer.from(publicKey32);
        if (priv.length === 33)
            priv = priv.subarray(1);
        if (pub.length === 33)
            pub = pub.subarray(1);
        const privDer = Buffer.concat([
            Buffer.from('302e020100300506032b656e04220420', 'hex'),
            priv
        ]);
        const pubDer = Buffer.concat([
            Buffer.from('302a300506032b656e032100', 'hex'),
            pub
        ]);
        const privKey = crypto.createPrivateKey({ key: privDer, format: 'der', type: 'pkcs8' });
        const pubKey = crypto.createPublicKey({ key: pubDer, format: 'der', type: 'spki' });
        return crypto.diffieHellman({ privateKey: privKey, publicKey: pubKey });
    }
    /**
     * Generates Curve25519 (X25519) key pair
     */
    static generateKeyPair() {
        const { privateKey, publicKey } = crypto.generateKeyPairSync('x25519', {
            publicKeyEncoding: { type: 'spki', format: 'der' },
            privateKeyEncoding: { type: 'pkcs8', format: 'der' }
        });
        const privRaw = privateKey.subarray(privateKey.length - 32);
        const pubRaw = publicKey.subarray(publicKey.length - 32);
        return {
            private: new Uint8Array(privRaw),
            public: new Uint8Array(pubRaw)
        };
    }
    /**
     * Generate Signed Pre-Key with cryptographic keyId
     */
    static generateSignedPreKey(identityKeyPair, keyId) {
        const keyPair = this.generateKeyPair();
        const hmac = crypto.createHmac('sha256', Buffer.from(identityKeyPair.private));
        hmac.update(Buffer.from(keyPair.public));
        const signature = new Uint8Array(hmac.digest());
        return { keyPair, signature, keyId };
    }
    /**
     * Generates a batch of Pre-Keys
     */
    static generatePreKeys(startId, count) {
        const keys = {};
        for (let i = 0; i < count; i++) {
            const id = startId + i;
            keys[id.toString()] = this.generateKeyPair();
        }
        return keys;
    }
    /**
     * HKDF Key Derivation (RFC 5869)
     */
    static hkdf(ikm, length, info, salt) {
        const saltBuf = salt ? Buffer.from(salt) : Buffer.alloc(32, 0);
        const infoBuf = typeof info === 'string' ? Buffer.from(info, 'utf-8') : Buffer.from(info);
        const ikmBuf = Buffer.from(ikm);
        return Buffer.from(crypto.hkdfSync('sha256', ikmBuf, saltBuf, infoBuf, length));
    }
    /**
     * AES-256-GCM authenticated encryption
     */
    static aesGcmEncrypt(plaintext, key, iv, additionalData) {
        const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
        if (additionalData && additionalData.length > 0) {
            cipher.setAAD(Buffer.from(additionalData));
        }
        const ciphertext = Buffer.concat([cipher.update(Buffer.from(plaintext)), cipher.final()]);
        const tag = cipher.getAuthTag();
        return { ciphertext, tag };
    }
    /**
     * AES-256-GCM authenticated decryption
     */
    static aesGcmDecrypt(ciphertext, key, iv, tag, additionalData) {
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key), Buffer.from(iv));
        decipher.setAuthTag(Buffer.from(tag));
        if (additionalData && additionalData.length > 0) {
            decipher.setAAD(Buffer.from(additionalData));
        }
        return Buffer.concat([decipher.update(Buffer.from(ciphertext)), decipher.final()]);
    }
    /**
     * HMAC-SHA256
     */
    static hmacSha256(key, data) {
        return crypto.createHmac('sha256', Buffer.from(key)).update(Buffer.from(data)).digest();
    }
    /**
     * SHA-256 Hash
     */
    static sha256(data) {
        const input = typeof data === 'string' ? Buffer.from(data, 'utf-8') : Buffer.from(data);
        return crypto.createHash('sha256').update(input).digest();
    }
    /**
     * Secure Random Bytes
     */
    static randomBytes(length) {
        return crypto.randomBytes(length);
    }
}
//# sourceMappingURL=crypto.js.map