import fs from 'fs';
import path from 'path';

export enum SecurityEventType {
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILED = 'LOGIN_FAILED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  REGISTRATION = 'REGISTRATION',
  PASSWORD_RESET_REQUEST = 'PASSWORD_RESET_REQUEST',
  PASSWORD_RESET_SUCCESS = 'PASSWORD_RESET_SUCCESS',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',
  ADMIN_ACTION = 'ADMIN_ACTION',
  PROFILE_UPDATE = 'PROFILE_UPDATE',
  PROFILE_EXPORT = 'PROFILE_EXPORT',
  PROFILE_IMPORT = 'PROFILE_IMPORT',
  LOGOUT = 'LOGOUT',
  UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
  DEVICE_MISMATCH_REFRESH_TOKEN = 'DEVICE_MISMATCH_REFRESH_TOKEN',
  LOGOUT_ALL_DEVICES = 'LOGOUT_ALL_DEVICES'
}

interface SecurityLogEntry {
  timestamp: string;
  eventType: SecurityEventType;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  details?: any;
}

class SecurityLogger {
  private logFilePath: string;

  constructor() {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    this.logFilePath = path.join(logsDir, 'security.log');
  }

  private writeLog(entry: SecurityLogEntry) {
    const logLine = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.logFilePath, logLine, 'utf8');
  }

  log(
    eventType: SecurityEventType,
    userId?: string,
    email?: string,
    ip?: string,
    userAgent?: string,
    details?: any
  ) {
    const entry: SecurityLogEntry = {
      timestamp: new Date().toISOString(),
      eventType,
      userId,
      email,
      ip,
      userAgent,
      details
    };
    this.writeLog(entry);
  }

  logLoginSuccess(userId: string, email: string, ip?: string, userAgent?: string) {
    this.log(SecurityEventType.LOGIN_SUCCESS, userId, email, ip, userAgent);
  }

  logLoginFailed(email: string, ip?: string, userAgent?: string, reason?: string) {
    this.log(SecurityEventType.LOGIN_FAILED, undefined, email, ip, userAgent, { reason });
  }

  logAccountLocked(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.ACCOUNT_LOCKED, userId, email, ip);
  }

  logRegistration(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.REGISTRATION, userId, email, ip);
  }

  logPasswordResetRequest(email: string, ip?: string) {
    this.log(SecurityEventType.PASSWORD_RESET_REQUEST, undefined, email, ip);
  }

  logPasswordResetSuccess(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.PASSWORD_RESET_SUCCESS, userId, email, ip);
  }

  logPasswordChanged(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.PASSWORD_CHANGED, userId, email, ip);
  }

  logMfaEnabled(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.MFA_ENABLED, userId, email, ip);
  }

  logMfaDisabled(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.MFA_DISABLED, userId, email, ip);
  }

  logAdminAction(userId: string, email: string, action: string, ip?: string, details?: any) {
    this.log(SecurityEventType.ADMIN_ACTION, userId, email, ip, undefined, { action, ...details });
  }

  logProfileUpdate(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.PROFILE_UPDATE, userId, email, ip);
  }

  logProfileExport(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.PROFILE_EXPORT, userId, email, ip);
  }

  logProfileImport(userId: string, email: string, ip?: string, details?: any) {
    this.log(SecurityEventType.PROFILE_IMPORT, userId, email, ip, undefined, details);
  }

  logLogout(userId: string, email: string, ip?: string) {
    this.log(SecurityEventType.LOGOUT, userId, email, ip);
  }

  logUnauthorizedAccess(userId?: string, email?: string, ip?: string, endpoint?: string) {
    this.log(SecurityEventType.UNAUTHORIZED_ACCESS, userId, email, ip, undefined, { endpoint });
  }

  logSecurityEvent(userId: string, email: string, ip?: string, eventType?: string, details?: any) {
    this.log(eventType as SecurityEventType, userId, email, ip, undefined, details);
  }
}

export const securityLogger = new SecurityLogger();
