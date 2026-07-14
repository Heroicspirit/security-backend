import { Router } from "express";
import { ProductController } from "../controllers/product.controller";
import { authenticate, authorize } from "../middleware/auth.middleware";
import { upload } from "../config/multer";

const productController = new ProductController();
const router = Router();

// Public routes
router.get("/", productController.getAllProducts);
router.get("/featured", productController.getFeaturedProducts);
router.get("/category/:category", productController.getProductsByCategory);
router.get("/:id", productController.getProductById);

// Protected routes (admin only)
router.post("/", authenticate, authorize('admin'), upload.array('images', 3), productController.createProduct);
router.put("/:id", authenticate, authorize('admin'), upload.array('images', 3), productController.updateProduct);
router.delete("/:id", authenticate, authorize('admin'), productController.deleteProduct);

export default router;
