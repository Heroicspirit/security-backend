import { OrderRepository } from "../repository/order.repository";
import { ProductRepository } from "../repository/product.repository";
import { HttpError } from "../errors/http-error";

const orderRepository = new OrderRepository();
const productRepository = new ProductRepository();

export class OrderService {
    async createOrder(data: any, userId?: string) {
        // Generate order number
        const orderNumber = `MP-${Date.now().toString().slice(-5)}`;
        
        // Validate stock for each item
        for (const item of data.items) {
            const product = await productRepository.getProductById(item.product);
            if (!product) {
                throw new HttpError(404, `Product ${item.title} not found`);
            }
            if (product.stock < item.quantity) {
                throw new HttpError(400, `Insufficient stock for ${item.title}`);
            }
        }

        // Calculate estimated delivery (5-7 days from now)
        const estimatedDelivery = new Date();
        estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);

        const orderData = {
            ...data,
            user: userId,
            orderNumber,
            estimatedDelivery,
            paymentStatus: data.paymentMethod === 'cod' ? 'pending' : 'pending'
        };

        const order = await orderRepository.createOrder(orderData);

        // Update stock for each item
        for (const item of data.items) {
            await productRepository.updateStock(item.product, item.quantity);
        }

        return order;
    }

    async getOrderById(id: string) {
        const order = await orderRepository.getOrderById(id);
        if (!order) {
            throw new HttpError(404, "Order not found");
        }
        return order;
    }

    async getOrdersByUser(userId: string, page: number = 1, size: number = 10) {
        return await orderRepository.getOrdersByUser(userId, page, size);
    }

    async getAllOrders(page: number = 1, size: number = 10) {
        return await orderRepository.getAllOrders(page, size);
    }

    async updateOrderStatus(id: string, status: string) {
        const order = await orderRepository.getOrderById(id);
        if (!order) {
            throw new HttpError(404, "Order not found");
        }
        return await orderRepository.updateOrderStatus(id, status);
    }

    async updatePaymentStatus(id: string, status: string) {
        const order = await orderRepository.getOrderById(id);
        if (!order) {
            throw new HttpError(404, "Order not found");
        }
        return await orderRepository.updatePaymentStatus(id, status);
    }

    async getOrderByOrderNumber(orderNumber: string) {
        const order = await orderRepository.getOrderByOrderNumber(orderNumber);
        if (!order) {
            throw new HttpError(404, "Order not found");
        }
        return order;
    }
}
