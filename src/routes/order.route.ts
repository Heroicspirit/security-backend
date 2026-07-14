import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const orderController = new OrderController();
const router = Router();

router.post("/", authenticate, orderController.createOrder);
router.get("/", authenticate, orderController.getAllOrders);
router.get("/my-orders", authenticate, orderController.getOrdersByUser);
router.get("/:id", authenticate, orderController.getOrderById);
router.get("/order-number/:orderNumber", authenticate, orderController.getOrderByOrderNumber);
router.put("/:id/status", authenticate, orderController.updateOrderStatus);
router.put("/:id/payment-status", authenticate, orderController.updatePaymentStatus);

export default router;
