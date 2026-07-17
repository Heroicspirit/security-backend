import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { upload } from "../config/multer";
import { ipBlockMiddleware } from "../middleware/ipBlock.middleware";

const productController = new ProductController();
const router = Router();

// Public routes
router.get("/", ipBlockMiddleware, productController.getAllProducts);
router.get("/featured", ipBlockMiddleware, productController.getFeaturedProducts);
router.get("/category/:category", ipBlockMiddleware, productController.getProductsByCategory);
router.get("/:id", ipBlockMiddleware, productController.getProductById);

// Protected routes (admin only)
router.post("/", ipBlockMiddleware, authenticate, authorize('admin'), upload.array('images', 3), productController.createProduct);
router.put("/:id", ipBlockMiddleware, authenticate, authorize('admin'), upload.array('images', 3), productController.updateProduct);
router.delete("/:id", ipBlockMiddleware, authenticate, authorize('admin'), productController.deleteProduct);

export default router;
