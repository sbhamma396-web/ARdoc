/**
 * CRYPTO SERVICE - Chiffrement AES-256-GCM avec dérivation de clé
 */

const crypto = require('crypto');

function generateMasterKey() {
    return crypto.randomBytes(32);
}

function deriveKey(masterKeyBytes, docId) {
    const salt = Buffer.from(`ARDOCSHIELD_${docId}`, 'utf8');
    return crypto.pbkdf2Sync(masterKeyBytes, salt, 100000, 32, 'sha256');
}

function encrypt(base64Data, key) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const dataBuffer = Buffer.from(base64Data, 'base64');
    const encrypted = Buffer.concat([cipher.update(dataBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    const combined = Buffer.concat([encrypted, authTag]);
    
    return {
        ciphertext: combined.toString('base64'),
        iv: iv.toString('base64')
    };
}

function decrypt(ciphertextBase64, ivBase64, key) {
    const combined = Buffer.from(ciphertextBase64, 'base64');
    const iv = Buffer.from(ivBase64, 'base64');
    
    const authTag = combined.slice(-16);
    const ciphertext = combined.slice(0, -16);
    
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted;
}

async function decryptDocument(doc) {
    if (!doc.qr_data?.masterKey) {
        throw new Error('MasterKey manquant');
    }
    
    const masterKeyBytes = Buffer.from(doc.qr_data.masterKey, 'base64');
    const derivedKey = deriveKey(masterKeyBytes, doc._id.toString());
    
    const decryptedBuffer = decrypt(doc.contenu_chiffre, doc.iv, derivedKey);
    return decryptedBuffer.toString('base64');
}

function hashSHA256(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

module.exports = {
    generateMasterKey,
    deriveKey,
    encrypt,
    decrypt,
    decryptDocument,
    hashSHA256
};