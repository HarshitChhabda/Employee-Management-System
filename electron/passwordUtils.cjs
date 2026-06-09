const crypto = require('crypto');

const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1, keylen: 32 };
const SALT_LENGTH = 16;

function hashPassword(password) {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(SALT_LENGTH);
    crypto.scrypt(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS, (err, derivedKey) => {
      if (err) return reject(err);
      const hash = salt.toString('base64') + ':' + derivedKey.toString('base64');
      resolve(hash);
    });
  });
}

function verifyPassword(password, storedHash) {
  return new Promise((resolve, reject) => {
    try {
      const [saltBase64, keyBase64] = storedHash.split(':');
      if (!saltBase64 || !keyBase64) {
        resolve(false);
        return;
      }
      const salt = Buffer.from(saltBase64, 'base64');
      const storedKey = Buffer.from(keyBase64, 'base64');
      crypto.scrypt(password, salt, SCRYPT_PARAMS.keylen, SCRYPT_PARAMS, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(crypto.timingSafeEqual(derivedKey, storedKey));
      });
    } catch (e) {
      reject(e);
    }
  });
}

function isPasswordHashed(password) {
  const parts = password.split(':');
  return parts.length === 2 && parts[0].length === SALT_LENGTH && Buffer.from(parts[0], 'base64').length === SALT_LENGTH;
}

function validatePasswordStrength(password) {
  if (!password || !/^\d{4}$/.test(password)) {
    return { valid: false, error: 'Password must be exactly a 4-digit PIN.' };
  }
  return { valid: true };
}

module.exports = {
  hashPassword,
  verifyPassword,
  isPasswordHashed,
  validatePasswordStrength
};
