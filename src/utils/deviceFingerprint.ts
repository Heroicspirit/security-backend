import crypto from 'crypto';

/**
 * Generate a device fingerprint from request headers
 * This creates a unique identifier for the device/browser combination
 */
export function generateDeviceFingerprint(req: any): string {
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const ip = req.ip || req.socket.remoteAddress || '';
    
    // Combine various request characteristics
    const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}|${ip}`;
    
    // Create a hash of the combined data
    return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Extract device info for logging and storage
 */
export function extractDeviceInfo(req: any) {
    return {
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: req.ip || req.socket.remoteAddress || 'Unknown',
        deviceFingerprint: generateDeviceFingerprint(req)
    };
}

/**
 * Check if the current device matches the stored device fingerprint
 */
export function isDeviceMatch(currentFingerprint: string, storedFingerprint: string): boolean {
    return currentFingerprint === storedFingerprint;
}
