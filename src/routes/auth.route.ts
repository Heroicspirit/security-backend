import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authorizedMiddleware } from "../middleware/authorization.middle";
import { authRateLimit, sensitiveRateLimit } from "../middleware/rateLimit.middleware";
import { checkBruteForce } from "../middleware/bruteForce.middleware";
import { ipBlockMiddleware } from "../middleware/ipBlock.middleware";

let authController = new AuthController();

const router = Router();

router.post("/register", authRateLimit, ipBlockMiddleware, authController.register);
router.post("/login", authRateLimit, ipBlockMiddleware, checkBruteForce((req) => req.body.email), authController.login);
router.post("/login-mfa-verify", authRateLimit, ipBlockMiddleware, authController.loginMfaVerify as any);
router.post("/check-mfa-status", authController.checkMfaStatus as any); // Check MFA status
router.post("/clear-mfa-data", authController.clearMfaData as any); // Temporary endpoint to clear corrupted MFA data
router.post("/request-password-reset", sensitiveRateLimit, ipBlockMiddleware, authController.sendResetPasswordEmail);
router.post("/reset-password/:token", sensitiveRateLimit, ipBlockMiddleware, authController.resetPassword);

// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleAuthCallback);

// User management routes (protected with IDOR protection)
router.get("/users", authorizedMiddleware as any, authController.getAllUsers as any);
router.get("/users/:userId", authorizedMiddleware as any, authController.getUserById as any);
router.put("/users/:userId", authorizedMiddleware as any, authController.updateUser as any);
router.delete("/users/:userId", authorizedMiddleware as any, authController.deleteUser as any);

// MFA routes (protected)
router.post("/mfa/generate-secret", authorizedMiddleware as any, authController.generateMfaSecret as any);
router.post("/mfa/enable", authorizedMiddleware as any, authController.enableMfa as any);
router.post("/mfa/verify", authorizedMiddleware as any, authController.verifyMfa as any);
router.post("/mfa/disable", authorizedMiddleware as any, authController.disableMfa as any);

// Password strength check
router.post("/check-password-strength", authController.checkPasswordStrength);

// CAPTCHA generation
router.get("/captcha", authController.generateCaptcha);

// Profile export/import (protected)
router.get("/profile/export", authorizedMiddleware as any, authController.exportProfile as any);
router.post("/profile/import", authorizedMiddleware as any, authController.importProfile as any);

// Session management routes
router.post("/refresh-token", authController.refreshToken as any);
router.post("/logout", authController.logout as any); // Remove auth middleware to allow logout even with expired tokens
router.post("/logout-all", authorizedMiddleware as any, authController.logoutAll as any);

export default router;
