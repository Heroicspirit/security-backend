import crypto from 'crypto';

interface CaptchaSession {
  code: string;
  expiresAt: number;
  attempts: number;
}

class CaptchaService {
  private sessions: Map<string, CaptchaSession> = new Map();
  private readonly SESSION_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;
  private readonly CODE_LENGTH = 6;

  generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  generateCaptcha(sessionId: string): { code: string; image: string } {
    // Generate a random 6-digit code
    const code = this.generateRandomCode();

    // Store the session
    this.sessions.set(sessionId, {
      code,
      expiresAt: Date.now() + this.SESSION_TTL,
      attempts: 0
    });

    // Generate a simple text-based CAPTCHA representation
    // In production, you'd use a library like svg-captcha to generate actual images
    const image = this.generateTextCaptcha(code);

    return { code, image };
  }

  private generateRandomCode(): string {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < this.CODE_LENGTH; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private generateTextCaptcha(code: string): string {
    // Simple ASCII art-style representation
    // In production, replace with svg-captcha or similar
    return `
╔════════════════════════╗
║   CAPTCHA CODE          ║
║                        ║
║   ${code.split('').join('  ')}   ║
║                        ║
║   Enter the code above ║
╚════════════════════════╝
    `.trim();
  }

  verifyCaptcha(sessionId: string, userCode: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }

    // Check if session expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Check max attempts
    if (session.attempts >= this.MAX_ATTEMPTS) {
      this.sessions.delete(sessionId);
      return false;
    }

    // Increment attempts
    session.attempts++;

    // Verify code (case-sensitive)
    const isValid = userCode === session.code;

    // Remove session if valid or max attempts reached
    if (isValid || session.attempts >= this.MAX_ATTEMPTS) {
      this.sessions.delete(sessionId);
    }

    return isValid;
  }

  // Cleanup expired sessions periodically
  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        this.sessions.delete(sessionId);
      }
    }
  }

  // Get remaining attempts for a session
  getRemainingAttempts(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    if (!session || Date.now() > session.expiresAt) {
      return 0;
    }
    return this.MAX_ATTEMPTS - session.attempts;
  }
}

export const captchaService = new CaptchaService();
