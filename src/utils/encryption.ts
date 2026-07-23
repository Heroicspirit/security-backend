import CryptoJS from "crypto-js";
import { ENCRYPTION_KEY } from "../config";

/**
 * Derive a deterministic 32-byte AES-256 key from ENCRYPTION_KEY using SHA-256.
 *
 * Hashing ensures the key is always exactly 32 bytes (256 bits) regardless of
 * ENCRYPTION_KEY length. This avoids:
 *   1) The EvpKDF passphrase issue (salt discarded → mismatched keys)
 *   2) Non-standard key sizes (CryptoJS misbehaves with keys > 32 bytes)
 */
const KEY = CryptoJS.SHA256(ENCRYPTION_KEY);

/**
 * Encrypts sensitive data using AES-256-CBC encryption.
 * @param plaintext - The plaintext string to encrypt
 * @returns Encrypted string as "IV_base64:ciphertext_base64"
 */
export function encrypt(plaintext: string): string {
    // Generate a random 16-byte IV for each encryption
    const iv = CryptoJS.lib.WordArray.random(16);

    // Encrypt with the WordArray key and explicit IV
    const encrypted = CryptoJS.AES.encrypt(plaintext, KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Persist IV alongside ciphertext so decrypt() can use the same IV
    return iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Base64);
}

/**
 * Decrypts data that was encrypted with encrypt()
 * @param encryptedText - The encrypted string in "IV_base64:ciphertext_base64" format
 * @returns Decrypted plaintext string
 */
export function decrypt(encryptedText: string): string {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
        throw new Error("Invalid encrypted text format");
    }

    const iv = CryptoJS.enc.Base64.parse(parts[0]);
    const ciphertext = CryptoJS.enc.Base64.parse(parts[1]);

    const cipherParams = CryptoJS.lib.CipherParams.create({
        ciphertext: ciphertext
    });

    const decrypted = CryptoJS.AES.decrypt(cipherParams, KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
        throw new Error("Decryption failed - invalid key or corrupted data");
    }

    return result;
}
