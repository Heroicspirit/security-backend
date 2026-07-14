import { OrderModel, IOrder } from "../models/order.model";

export class OrderRepository {
    async createOrder(orderData: any) {
        const order = new OrderModel(orderData);
        return await order.save();
    }

    async getOrderById(id: string) {
        return await OrderModel.findById(id).populate('user').populate('items.product');
    }

    async getOrdersByUser(userId: string, page: number = 1, size: number = 10) {
        const skip = (page - 1) * size;
        const orders = await OrderModel.find({ user: userId })
            .skip(skip)
            .limit(size)
            .sort({ createdAt: -1 })
            .populate('items.product');
        const total = await OrderModel.countDocuments({ user: userId });
        return { orders, total, page, size };
    }

    async getAllOrders(page: number = 1, size: number = 10) {
        const skip = (page - 1) * size;
        const orders = await OrderModel.find()
            .skip(skip)
            .limit(size)
            .sort({ createdAt: -1 })
            .populate('user')
            .populate('items.product');
        const total = await OrderModel.countDocuments();
        return { orders, total, page, size };
    }

    async updateOrderStatus(id: string, status: string) {
        return await OrderModel.findByIdAndUpdate(id, { orderStatus: status }, { new: true });
    }

    async updatePaymentStatus(id: string, status: string) {
        return await OrderModel.findByIdAndUpdate(id, { paymentStatus: status }, { new: true });
    }

    async getOrderByOrderNumber(orderNumber: string) {
        return await OrderModel.findOne({ orderNumber }).populate('user').populate('items.product');
    }
}
