const BASE62_CHARACTERS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * Generates a random Base62 string of a given length.
 * @param {number} length - The length of the generated string (default 6).
 * @returns {string} The generated Base62 short code.
 */
export function generateShortCode(length = 6) {
  let result = '';
  const charactersLength = BASE62_CHARACTERS.length;
  for (let i = 0; i < length; i++) {
    // Cryptographically secure or fast pseudo-random lookup
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += BASE62_CHARACTERS[randomIndex];
  }
  return result;
}

/**
 * Validates whether a short code or custom alias matches acceptable characters.
 * Allows letters, numbers, hyphens, and underscores.
 * @param {string} code - The code to validate.
 * @returns {boolean} True if valid.
 */
export function isValidAlias(code) {
  const aliasRegex = /^[a-zA-Z0-9-_]{3,30}$/;
  return aliasRegex.test(code);
}
