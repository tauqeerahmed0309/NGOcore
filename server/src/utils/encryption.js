const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const ENCRYPTION_PREFIX = 'enc:v1:';

// Derive 32-byte master encryption key from environment variable
const getMasterKey = () => {
  const secret = process.env.FIELD_ENCRYPTION_KEY || process.env.JWT_SECRET || 'ngo-connect-master-encryption-key-default-32B';
  return crypto.createHash('sha256').update(secret).digest();
};

/**
 * Encrypt a plaintext string using AES-256-GCM
 * @param {string} text - Plain text to encrypt
 * @param {Buffer} [customKey] - Optional custom key
 * @returns {string} Encrypted string in format: enc:v1:<iv>:<tag>:<ciphertext>
 */
const encrypt = (text, customKey = null) => {
  if (text === null || text === undefined || text === '') {
    return text;
  }

  const strText = typeof text === 'string' ? text : JSON.stringify(text);

  // If already encrypted, do not re-encrypt
  if (strText.startsWith(ENCRYPTION_PREFIX)) {
    return strText;
  }

  const key = customKey || getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(strText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
};

/**
 * Decrypt an AES-256-GCM encrypted string
 * @param {string} encryptedString - Encrypted string in format: enc:v1:<iv>:<tag>:<ciphertext>
 * @param {Buffer} [customKey] - Optional custom key
 * @returns {string} Decrypted plaintext string
 */
const decrypt = (encryptedString, customKey = null) => {
  if (typeof encryptedString !== 'string' || !encryptedString.startsWith(ENCRYPTION_PREFIX)) {
    return encryptedString;
  }

  try {
    const parts = encryptedString.slice(ENCRYPTION_PREFIX.length).split(':');
    if (parts.length !== 3) {
      return encryptedString;
    }

    const [ivHex, authTagHex, cipherHex] = parts;
    const key = customKey || getMasterKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(cipherHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    // Attempt parsing JSON if it was stringified object
    try {
      if ((decrypted.startsWith('{') && decrypted.endsWith('}')) || (decrypted.startsWith('[') && decrypted.endsWith(']'))) {
        return JSON.parse(decrypted);
      }
    } catch {
      // Return as plain string
    }

    return decrypted;
  } catch (err) {
    console.warn('Decryption failed, returning ciphertext payload:', err.message);
    return encryptedString;
  }
};

/**
 * Check if a value is encrypted
 */
const isEncrypted = (value) => {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
};

module.exports = {
  encrypt,
  decrypt,
  isEncrypted,
  getMasterKey
};
