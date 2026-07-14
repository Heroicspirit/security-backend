import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authorizedMiddleware } from "../middleware/authorization.middle";

let authController = new AuthController();

const router = Router();

router.post("/register", authController.register);
router.post("/login",authController.login);
router.post("/request-password-reset", authController.sendResetPasswordEmail);
router.post("/reset-password/:token", authController.resetPassword);

// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleAuthCallback);

// MFA routes (protected)
router.post("/mfa/generate-secret", authorizedMiddleware as any, authController.generateMfaSecret as any);
router.post("/mfa/enable", authorizedMiddleware as any, authController.enableMfa as any);
router.post("/mfa/verify", authorizedMiddleware as any, authController.verifyMfa as any);
router.post("/mfa/disable", authorizedMiddleware as any, authController.disableMfa as any);

export default router;
