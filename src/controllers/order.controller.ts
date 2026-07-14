import { CreateOrderDto } from "../dtos/order.dtos";
import { OrderService } from "../services/order.service";
import { Request, Response } from "express";

const orderService = new OrderService();

export class OrderController {
    async createOrder(req: Request, res: Response) {
        try {
            const userId = (req as any).authUser?.id;
            const parsedData = CreateOrderDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            const newOrder = await orderService.createOrder(parsedData.data, userId);
            return res.status(201).json({
                success: true,
                data: newOrder,
                message: "Order created successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getOrderById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const order = await orderService.getOrderById(id);
            return res.status(200).json({
                success: true,
                data: order
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getOrdersByUser(req: Request, res: Response) {
        try {
            const userId = (req as any).authUser?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            
            const result = await orderService.getOrdersByUser(userId, page, size);
            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getAllOrders(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            
            const result = await orderService.getAllOrders(page, size);
            return res.status(200).json({
                success: true,
                ...result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async updateOrderStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const updatedOrder = await orderService.updateOrderStatus(id, status);
            return res.status(200).json({
                success: true,
                data: updatedOrder,
                message: "Order status updated successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async updatePaymentStatus(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { status } = req.body;
            const updatedOrder = await orderService.updatePaymentStatus(id, status);
            return res.status(200).json({
                success: true,
                data: updatedOrder,
                message: "Payment status updated successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getOrderByOrderNumber(req: Request, res: Response) {
        try {
            const { orderNumber } = req.params;
            const order = await orderService.getOrderByOrderNumber(orderNumber);
            return res.status(200).json({
                success: true,
                data: order
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }
}
