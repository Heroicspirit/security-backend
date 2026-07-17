import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";
import { ipBlockMiddleware } from "../middleware/ipBlock.middleware";

const orderController = new OrderController();
const router = Router();

router.post("/", ipBlockMiddleware, authenticate, orderController.createOrder);
router.get("/", ipBlockMiddleware, authenticate, orderController.getAllOrders);
router.get("/my-orders", ipBlockMiddleware, authenticate, orderController.getOrdersByUser);
router.get("/:id", ipBlockMiddleware, authenticate, orderController.getOrderById);
router.get("/order-number/:orderNumber", ipBlockMiddleware, authenticate, orderController.getOrderByOrderNumber);
router.put("/:id/status", ipBlockMiddleware, authenticate, orderController.updateOrderStatus);
router.put("/:id/payment-status", ipBlockMiddleware, authenticate, orderController.updatePaymentStatus);

export default router;
