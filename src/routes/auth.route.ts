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

export default router;
