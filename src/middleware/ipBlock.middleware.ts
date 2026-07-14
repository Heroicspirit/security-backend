import { Request, Response, NextFunction } from 'express';

// IP blocking configuration
interface IPBlockConfig {
  blockedIPs: Set<string>;
  allowedIPs: Set<string>;
  blockDuration: number; // in milliseconds
  suspiciousIPs: Map<string, { count: number; lastActivity: number }>;
  maxSuspiciousAttempts: number;
  suspiciousWindow: number; // time window in milliseconds
}

class IPBlockManager {
  private config: IPBlockConfig;
  private temporaryBlocks: Map<string, { expiresAt: number; reason: string }>;

  constructor() {
    this.config = {
      blockedIPs: new Set(),
      allowedIPs: new Set(),
      blockDuration: 24 * 60 * 60 * 1000, // 24 hours default
      suspiciousIPs: new Map(),
      maxSuspiciousAttempts: 10,
      suspiciousWindow: 15 * 60 * 1000, // 15 minutes
    };
    this.temporaryBlocks = new Map();
    this.loadConfiguration();
  }

  private loadConfiguration() {
    // Load blocked IPs from environment variable (comma-separated)
    const blockedIPsEnv = process.env.BLOCKED_IPS;
    if (blockedIPsEnv) {
      blockedIPsEnv.split(',').forEach(ip => {
        this.config.blockedIPs.add(ip.trim());
      });
    }

    // Load allowed IPs from environment variable (comma-separated)
    const allowedIPsEnv = process.env.ALLOWED_IPS;
    if (allowedIPsEnv) {
      allowedIPsEnv.split(',').forEach(ip => {
        this.config.allowedIPs.add(ip.trim());
      });
    }

    // Load configuration from environment
    this.config.blockDuration = parseInt(process.env.IP_BLOCK_DURATION || '86400000');
    this.config.maxSuspiciousAttempts = parseInt(process.env.MAX_SUSPICIOUS_ATTEMPTS || '10');
    this.config.suspiciousWindow = parseInt(process.env.SUSPICIOUS_WINDOW || '900000');
  }

  /**
   * Check if an IP is permanently blocked
   */
  isPermanentlyBlocked(ip: string): boolean {
    return this.config.blockedIPs.has(ip);
  }

  /**
   * Check if an IP is temporarily blocked
   */
  isTemporarilyBlocked(ip: string): boolean {
    const block = this.temporaryBlocks.get(ip);
    if (!block) return false;

    if (Date.now() > block.expiresAt) {
      // Block expired, remove it
      this.temporaryBlocks.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Check if an IP is allowed (if allow-list is enabled)
   */
  isAllowed(ip: string): boolean {
    // If allow-list is empty, all IPs are allowed
    if (this.config.allowedIPs.size === 0) return true;
    return this.config.allowedIPs.has(ip);
  }

  /**
   * Block an IP temporarily
   */
  blockIP(ip: string, reason: string, duration?: number): void {
    const blockDuration = duration || this.config.blockDuration;
    this.temporaryBlocks.set(ip, {
      expiresAt: Date.now() + blockDuration,
      reason,
    });
  }

  /**
   * Permanently block an IP
   */
  permanentlyBlockIP(ip: string): void {
    this.config.blockedIPs.add(ip);
  }

  /**
   * Remove an IP from permanent block list
   */
  unblockIP(ip: string): void {
    this.config.blockedIPs.delete(ip);
    this.temporaryBlocks.delete(ip);
  }

  /**
   * Add IP to allow-list
   */
  allowIP(ip: string): void {
    this.config.allowedIPs.add(ip);
  }

  /**
   * Remove IP from allow-list
   */
  removeAllowedIP(ip: string): void {
    this.config.allowedIPs.delete(ip);
  }

  /**
   * Track suspicious activity from an IP
   */
  trackSuspiciousActivity(ip: string): boolean {
    const now = Date.now();
    const activity = this.config.suspiciousIPs.get(ip);

    if (!activity) {
      this.config.suspiciousIPs.set(ip, { count: 1, lastActivity: now });
      return false;
    }

    // Reset count if outside the suspicious window
    if (now - activity.lastActivity > this.config.suspiciousWindow) {
      activity.count = 1;
      activity.lastActivity = now;
      this.config.suspiciousIPs.set(ip, activity);
      return false;
    }

    // Increment count
    activity.count++;
    activity.lastActivity = now;
    this.config.suspiciousIPs.set(ip, activity);

    // Check if threshold exceeded
    if (activity.count >= this.config.maxSuspiciousAttempts) {
      this.blockIP(ip, 'Too many suspicious activities');
      this.config.suspiciousIPs.delete(ip);
      return true;
    }

    return false;
  }

  /**
   * Get block information for an IP
   */
  getBlockInfo(ip: string): { blocked: boolean; reason?: string; expiresAt?: number } | null {
    if (this.isPermanentlyBlocked(ip)) {
      return { blocked: true, reason: 'Permanently blocked' };
    }

    const tempBlock = this.temporaryBlocks.get(ip);
    if (tempBlock) {
      return {
        blocked: true,
        reason: tempBlock.reason,
        expiresAt: tempBlock.expiresAt,
      };
    }

    return null;
  }

  /**
   * Clean up expired temporary blocks
   */
  cleanupExpiredBlocks(): void {
    const now = Date.now();
    for (const [ip, block] of this.temporaryBlocks.entries()) {
      if (now > block.expiresAt) {
        this.temporaryBlocks.delete(ip);
      }
    }
  }
}

// Singleton instance
const ipBlockManager = new IPBlockManager();

// Clean up expired blocks every hour
setInterval(() => {
  ipBlockManager.cleanupExpiredBlocks();
}, 60 * 60 * 1000);

/**
 * Middleware to check IP blocking
 */
export const ipBlockMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Check if IP is allowed (if allow-list is enabled)
  if (!ipBlockManager.isAllowed(ip)) {
    return res.status(403).json({
      success: false,
      message: 'Your IP is not allowed to access this resource',
    });
  }

  // Check if IP is permanently blocked
  if (ipBlockManager.isPermanentlyBlocked(ip)) {
    return res.status(403).json({
      success: false,
      message: 'Your IP has been permanently blocked',
    });
  }

  // Check if IP is temporarily blocked
  if (ipBlockManager.isTemporarilyBlocked(ip)) {
    const blockInfo = ipBlockManager.getBlockInfo(ip);
    const remainingTime = blockInfo?.expiresAt 
      ? Math.ceil((blockInfo.expiresAt - Date.now()) / 1000 / 60) 
      : 0;

    return res.status(403).json({
      success: false,
      message: `Your IP has been temporarily blocked. Try again in ${remainingTime} minutes.`,
      reason: blockInfo?.reason,
    });
  }

  next();
};

/**
 * Middleware to track and block suspicious IPs
 */
export const suspiciousActivityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Track suspicious activity
  const shouldBlock = ipBlockManager.trackSuspiciousActivity(ip);
  if (shouldBlock) {
    return res.status(429).json({
      success: false,
      message: 'Too many suspicious activities detected. Your IP has been temporarily blocked.',
    });
  }

  next();
};

/**
 * Middleware to block IPs on authentication failures
 */
export const authFailureMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';

  // Track failed authentication attempt
  const shouldBlock = ipBlockManager.trackSuspiciousActivity(ip);
  if (shouldBlock) {
    return res.status(429).json({
      success: false,
      message: 'Too many failed authentication attempts. Your IP has been temporarily blocked.',
    });
  }

  next();
};

// Export the manager for use in other parts of the application
export { ipBlockManager };
export default ipBlockMiddleware;
