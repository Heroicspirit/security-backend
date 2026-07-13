import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

let authController = new AuthController();

const router = Router();

router.post("/register", authController.register);
router.post("/login",authController.login);
router.post("/request-password-reset", authController.sendResetPasswordEmail);
router.post("/reset-password/:token", authController.resetPassword);

// Google OAuth routes
router.get("/google", authController.googleAuth);
router.get("/google/callback", authController.googleAuthCallback);

export default router;
