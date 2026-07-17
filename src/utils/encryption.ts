import CryptoJS from "crypto-js";
import { ENCRYPTION_KEY } from "../config";

/**
 * Encrypts sensitive data using AES encryption
 * @param plaintext - The plaintext string to encrypt
 * @returns Encrypted string (base64 encoded with IV prepended)
 */
export function encrypt(plaintext: string): string {
    const iv = CryptoJS.lib.WordArray.random(16);
    const encrypted = CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });

    // Prepend IV to ciphertext so it can be extracted during decryption
    const combined = iv.toString(CryptoJS.enc.Base64) + ':' + encrypted.ciphertext.toString(CryptoJS.enc.Base64);
    return combined;
}

/**
 * Decrypts data that was encrypted with encrypt()
 * @param encryptedText - The encrypted string (IV:ciphertext format from encrypt())
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

    const decrypted = CryptoJS.AES.decrypt(cipherParams, ENCRYPTION_KEY, {
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
