import z from 'zod';

// Password policy configuration
export const PASSWORD_POLICY = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  preventCommonPasswords: true,
  preventUserInfo: true,
  expiryDays: 90,
  historyCount: 5, // Number of previous passwords to prevent reuse
  minStrength: 3 // On a scale of 0-4
};

// Common weak passwords to prevent
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', 'master', 'dragon', '111111', 'baseball',
  'iloveyou', 'trustno1', 'sunshine', 'princess', 'admin',
  'welcome', 'shadow', 'ashley', 'football', 'jesus',
  'michael', 'ninja', 'mustang', 'password1', 'password123'
];

// Special characters that are allowed
const SPECIAL_CHARS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export interface PasswordStrengthResult {
  score: number;
  feedback: string[];
  isAcceptable: boolean;
}

export class PasswordPolicy {
  /**
   * Validate password against policy requirements
   */
  static validate(password: string, userInfo?: { email?: string; name?: string }): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < PASSWORD_POLICY.minLength) {
      errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
    }

    if (password.length > PASSWORD_POLICY.maxLength) {
      errors.push(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
    }

    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (PASSWORD_POLICY.requireNumbers && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (PASSWORD_POLICY.requireSpecialChars && !new RegExp(`[${SPECIAL_CHARS.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password)) {
      errors.push(`Password must contain at least one special character (${SPECIAL_CHARS})`);
    }

    if (PASSWORD_POLICY.preventCommonPasswords) {
      const lowerPassword = password.toLowerCase();
      if (COMMON_PASSWORDS.some(common => lowerPassword.includes(common))) {
        errors.push('Password contains common patterns and is not allowed');
      }
    }

    if (PASSWORD_POLICY.preventUserInfo && userInfo) {
      const lowerPassword = password.toLowerCase();
      if (userInfo.email && lowerPassword.includes(userInfo.email.split('@')[0].toLowerCase())) {
        errors.push('Password must not contain your email username');
      }
      if (userInfo.name && lowerPassword.includes(userInfo.name.toLowerCase())) {
        errors.push('Password must not contain your name');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate password strength score (0-4)
   */
  static calculateStrength(password: string): PasswordStrengthResult {
    let score = 0;
    const feedback: string[] = [];

    // Length contribution
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;

    // Character variety contribution
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = new RegExp(`[${SPECIAL_CHARS.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password);

    const varietyCount = [hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length;
    score += Math.min(varietyCount - 1, 1);

    // Cap at 4
    score = Math.min(score, 4);

    // Generate feedback
    if (password.length < 8) {
      feedback.push('Password is too short');
    } else if (password.length < 12) {
      feedback.push('Consider using a longer password');
    }

    if (!hasUpper) feedback.push('Add uppercase letters');
    if (!hasLower) feedback.push('Add lowercase letters');
    if (!hasNumber) feedback.push('Add numbers');
    if (!hasSpecial) feedback.push('Add special characters');

    if (COMMON_PASSWORDS.some(common => password.toLowerCase().includes(common))) {
      feedback.push('Avoid common password patterns');
      score = Math.min(score, 1);
    }

    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
    
    return {
      score,
      feedback,
      isAcceptable: score >= PASSWORD_POLICY.minStrength
    };
  }

  /**
   * Check if password matches any in history
   */
  static async checkPasswordHistory(
    userId: string,
    newPassword: string,
    hashedHistory: string[],
    compareFn: (plain: string, hashed: string) => Promise<boolean>
  ): Promise<boolean> {
    for (const oldHashedPassword of hashedHistory) {
      const matches = await compareFn(newPassword, oldHashedPassword);
      if (matches) {
        return true; // Password found in history
      }
    }
    return false;
  }

  /**
   * Generate Zod schema for password validation
   */
  static getZodSchema() {
    return z.string()
      .min(PASSWORD_POLICY.minLength, `Password must be at least ${PASSWORD_POLICY.minLength} characters`)
      .max(PASSWORD_POLICY.maxLength, `Password must not exceed ${PASSWORD_POLICY.maxLength} characters`)
      .refine(
        (password) => PASSWORD_POLICY.requireUppercase ? /[A-Z]/.test(password) : true,
        PASSWORD_POLICY.requireUppercase ? 'Password must contain at least one uppercase letter' : ''
      )
      .refine(
        (password) => PASSWORD_POLICY.requireLowercase ? /[a-z]/.test(password) : true,
        PASSWORD_POLICY.requireLowercase ? 'Password must contain at least one lowercase letter' : ''
      )
      .refine(
        (password) => PASSWORD_POLICY.requireNumbers ? /\d/.test(password) : true,
        PASSWORD_POLICY.requireNumbers ? 'Password must contain at least one number' : ''
      )
      .refine(
        (password) => PASSWORD_POLICY.requireSpecialChars ? new RegExp(`[${SPECIAL_CHARS.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}]`).test(password) : true,
        PASSWORD_POLICY.requireSpecialChars ? `Password must contain at least one special character (${SPECIAL_CHARS})` : ''
      );
  }
}
