import { Request, Response, NextFunction } from 'express';

interface FailedAttempt {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil?: number;
}

class BruteForceProtection {
  private attempts: Map<string, FailedAttempt> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
  private readonly WINDOW_MS = 15 * 60 * 1000; // 15 minutes window
  private readonly CAPTCHA_THRESHOLD = 3; // Require CAPTCHA after 3 failed attempts

  private getKey(identifier: string): string {
    return `brute_force:${identifier}`;
  }

  private cleanupOldAttempts(): void {
    const now = Date.now();
    for (const [key, attempt] of this.attempts.entries()) {
      // Remove entries that are outside the window and not locked
      if (now - attempt.lastAttempt > this.WINDOW_MS && !attempt.lockedUntil) {
        this.attempts.delete(key);
      }
      // Remove expired lockouts
      if (attempt.lockedUntil && now > attempt.lockedUntil) {
        this.attempts.delete(key);
      }
    }
  }

  recordFailedAttempt(identifier: string): { 
    requiresCaptcha: boolean; 
    isLocked: boolean; 
    remainingAttempts: number;
    lockoutTime?: number;
  } {
    this.cleanupOldAttempts();
    
    const key = this.getKey(identifier);
    const existing = this.attempts.get(key);
    const now = Date.now();

    if (existing) {
      // Check if currently locked
      if (existing.lockedUntil && now < existing.lockedUntil) {
        return {
          requiresCaptcha: true,
          isLocked: true,
          remainingAttempts: 0,
          lockoutTime: existing.lockedUntil
        };
      }

      // Reset if outside window
      if (now - existing.lastAttempt > this.WINDOW_MS) {
        this.attempts.set(key, {
          count: 1,
          firstAttempt: now,
          lastAttempt: now
        });
        return {
          requiresCaptcha: false,
          isLocked: false,
          remainingAttempts: this.MAX_ATTEMPTS - 1
        };
      }

      // Increment attempts
      existing.count++;
      existing.lastAttempt = now;

      // Check if should be locked
      if (existing.count >= this.MAX_ATTEMPTS) {
        existing.lockedUntil = now + this.LOCKOUT_DURATION;
        return {
          requiresCaptcha: true,
          isLocked: true,
          remainingAttempts: 0,
          lockoutTime: existing.lockedUntil
        };
      }

      return {
        requiresCaptcha: existing.count >= this.CAPTCHA_THRESHOLD,
        isLocked: false,
        remainingAttempts: this.MAX_ATTEMPTS - existing.count
      };
    }

    // First attempt
    this.attempts.set(key, {
      count: 1,
      firstAttempt: now,
      lastAttempt: now
    });

    return {
      requiresCaptcha: false,
      isLocked: false,
      remainingAttempts: this.MAX_ATTEMPTS - 1
    };
  }

  recordSuccessfulAttempt(identifier: string): void {
    const key = this.getKey(identifier);
    this.attempts.delete(key);
  }

  isLocked(identifier: string): { locked: boolean; unlockTime?: number } {
    const key = this.getKey(identifier);
    const attempt = this.attempts.get(key);
    const now = Date.now();

    if (attempt && attempt.lockedUntil && now < attempt.lockedUntil) {
      return {
        locked: true,
        unlockTime: attempt.lockedUntil
      };
    }

    return { locked: false };
  }

  getAttemptInfo(identifier: string): {
    count: number;
    remainingAttempts: number;
    requiresCaptcha: boolean;
    isLocked: boolean;
    lockoutTime?: number;
  } {
    const key = this.getKey(identifier);
    const attempt = this.attempts.get(key);
    const now = Date.now();

    if (!attempt) {
      return {
        count: 0,
        remainingAttempts: this.MAX_ATTEMPTS,
        requiresCaptcha: false,
        isLocked: false
      };
    }

    // Check if locked
    if (attempt.lockedUntil && now < attempt.lockedUntil) {
      return {
        count: attempt.count,
        remainingAttempts: 0,
        requiresCaptcha: true,
        isLocked: true,
        lockoutTime: attempt.lockedUntil
      };
    }

    // Check if outside window
    if (now - attempt.lastAttempt > this.WINDOW_MS) {
      return {
        count: 0,
        remainingAttempts: this.MAX_ATTEMPTS,
        requiresCaptcha: false,
        isLocked: false
      };
    }

    return {
      count: attempt.count,
      remainingAttempts: this.MAX_ATTEMPTS - attempt.count,
      requiresCaptcha: attempt.count >= this.CAPTCHA_THRESHOLD,
      isLocked: false
    };
  }

  resetAttempts(identifier: string): void {
    const key = this.getKey(identifier);
    this.attempts.delete(key);
  }
}

export const bruteForceProtection = new BruteForceProtection();

// Middleware to check brute force protection before login
export const checkBruteForce = (identifierExtractor: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = identifierExtractor(req);
    const info = bruteForceProtection.getAttemptInfo(identifier);

    if (info.isLocked) {
      return res.status(429).json({
        success: false,
        message: 'Account temporarily locked due to too many failed attempts',
        lockedUntil: new Date(info.lockoutTime!).toISOString(),
        retryAfter: Math.ceil((info.lockoutTime! - Date.now()) / 1000)
      });
    }

    // Add attempt info to request for use in controllers
    (req as any).bruteForceInfo = info;
    next();
  };
};

// Middleware to record failed login attempts
export const recordFailedLogin = (identifierExtractor: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = identifierExtractor(req);
    const result = bruteForceProtection.recordFailedAttempt(identifier);

    // Add result to response headers or body
    res.setHeader('X-RateLimit-Remaining', result.remainingAttempts.toString());
    
    if (result.requiresCaptcha) {
      res.setHeader('X-Require-Captcha', 'true');
    }

    next();
  };
};

// Middleware to record successful login attempts
export const recordSuccessfulLogin = (identifierExtractor: (req: Request) => string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const identifier = identifierExtractor(req);
    bruteForceProtection.recordSuccessfulAttempt(identifier);
    next();
  };
};
