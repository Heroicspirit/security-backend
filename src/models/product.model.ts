import mongoose, { Document, Schema } from "mongoose";

const ProductSchema: Schema = new Schema({
    title: { type: String, required: true },
    brand: { type: String, required: true },
    category: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discountBadge: { type: String },
    description: { type: String },
    image: { type: String, required: true },
    images: [{ type: String }],
    rating: { type: Number, default: 0 },
    reviewsCount: { type: Number, default: 0 },
    specs: [{
        label: { type: String },
        value: { type: String }
    }],
    stock: { type: Number, default: 0 },
    featured: { type: Boolean, default: false }
}, {
    timestamps: true,
});

export interface IProduct extends Document {
    _id: mongoose.Types.ObjectId;
    title: string;
    brand: string;
    category: string;
    price: number;
    originalPrice?: number;
    discountBadge?: string;
    description?: string;
    image: string;
    images: string[];
    rating: number;
    reviewsCount: number;
    specs: { label: string; value: string }[];
    stock: number;
    featured: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export const ProductModel = mongoose.model<IProduct>('Product', ProductSchema);
