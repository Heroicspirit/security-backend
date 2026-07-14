import mongoose, { Document, Schema } from "mongoose";

const OrderItemSchema: Schema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 }
});

const OrderSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    orderNumber: { type: String, required: true, unique: true },
    items: [OrderItemSchema],
    shippingAddress: {
        firstName: { type: String, required: true },
        lastName: { type: String, required: true },
        phone: { type: String, required: true },
        city: { type: String, required: true },
        address: { type: String, required: true }
    },
    paymentMethod: { type: String, enum: ['cod', 'khalti', 'imepay'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed'], default: 'pending' },
    orderStatus: { type: String, enum: ['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'confirmed' },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, default: 0 },
    total: { type: Number, required: true },
    estimatedDelivery: { type: Date }
}, {
    timestamps: true,
});

export interface IOrder extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    orderNumber: string;
    items: {
        product: mongoose.Types.ObjectId;
        title: string;
        image: string;
        price: number;
        quantity: number;
    }[];
    shippingAddress: {
        firstName: string;
        lastName: string;
        phone: string;
        city: string;
        address: string;
    };
    paymentMethod: 'cod' | 'khalti' | 'imepay';
    paymentStatus: 'pending' | 'paid' | 'failed';
    orderStatus: 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
    subtotal: number;
    shippingCost: number;
    total: number;
    estimatedDelivery?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export const OrderModel = mongoose.model<IOrder>('Order', OrderSchema);
