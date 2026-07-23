import { Router } from "express";
import { CartController } from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth.middleware";

const cartController = new CartController();
const router = Router();

router.get("/", authenticate, cartController.getCart);
router.post("/add", authenticate, cartController.addItemToCart);
router.put("/item/:productId", authenticate, cartController.updateCartItem);
router.delete("/item/:productId", authenticate, cartController.removeItemFromCart);
router.delete("/clear", authenticate, cartController.clearCart);

export default router;
