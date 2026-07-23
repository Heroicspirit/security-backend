import mongoose, { Document, Schema } from "mongoose";

const CartItemSchema: Schema = new Schema({
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    title: { type: String, required: true },
    image: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1 }
});

const CartSchema: Schema = new Schema({
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: [CartItemSchema]
}, {
    timestamps: true,
});

export interface ICart extends Document {
    _id: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    items: {
        product: mongoose.Types.ObjectId;
        title: string;
        image: string;
        price: number;
        quantity: number;
    }[];
    createdAt: Date;
    updatedAt: Date;
}

export const CartModel = mongoose.model<ICart>('Cart', CartSchema);
