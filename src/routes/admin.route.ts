import { Router } from "express";
import { authorizedMiddleware, adminMiddleware } from "../middleware/authorization.middle";
import { AuthController } from "../controllers/auth.controller";

const authController = new AuthController();
const router = Router();

// Admin user management routes
router.get("/users/", authorizedMiddleware as any, adminMiddleware as any, authController.getAllUsers as any);
router.get("/users/:userId", authorizedMiddleware as any, adminMiddleware as any, authController.getUserById as any);
router.put("/users/:userId", authorizedMiddleware as any, adminMiddleware as any, authController.updateUser as any);
router.delete("/users/:userId", authorizedMiddleware as any, adminMiddleware as any, authController.deleteUser as any);

export default router;
