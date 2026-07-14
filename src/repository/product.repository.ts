import { ProductModel, IProduct } from "../models/product.model";

export class ProductRepository {
    async createProduct(productData: any) {
        const product = new ProductModel(productData);
        return await product.save();
    }

    async getAllProducts(page: number = 1, size: number = 10, search?: string, category?: string) {
        const query: any = {};
        if (search) {
            query.$or = [
                { title: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } }
            ];
        }
        if (category) {
            query.category = category;
        }

        const skip = (page - 1) * size;
        const products = await ProductModel.find(query)
            .skip(skip)
            .limit(size)
            .sort({ createdAt: -1 });
        const total = await ProductModel.countDocuments(query);
        return { products, total, page, size };
    }

    async getProductById(id: string) {
        return await ProductModel.findById(id);
    }

    async getFeaturedProducts() {
        return await ProductModel.find({ featured: true }).limit(8);
    }

    async getProductsByCategory(category: string) {
        return await ProductModel.find({ category }).sort({ createdAt: -1 });
    }

    async updateProduct(id: string, updateData: any) {
        return await ProductModel.findByIdAndUpdate(id, updateData, { new: true });
    }

    async deleteProduct(id: string) {
        return await ProductModel.findByIdAndDelete(id);
    }

    async updateStock(id: string, quantity: number) {
        return await ProductModel.findByIdAndUpdate(
            id,
            { $inc: { stock: -quantity } },
            { new: true }
        );
    }
}
