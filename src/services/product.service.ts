import { CreateProductDto, UpdateProductDto } from "../dtos/product.dtos";
import { ProductRepository } from "../repository/product.repository";
import { HttpError } from "../errors/http-error";

const productRepository = new ProductRepository();

export class ProductService {
    async createProduct(data: CreateProductDto) {
        return await productRepository.createProduct(data);
    }

    async getAllProducts(page: number = 1, size: number = 10, search?: string, category?: string) {
        return await productRepository.getAllProducts(page, size, search, category);
    }

    async getProductById(id: string) {
        const product = await productRepository.getProductById(id);
        if (!product) {
            throw new HttpError(404, "Product not found");
        }
        return product;
    }

    async getFeaturedProducts() {
        return await productRepository.getFeaturedProducts();
    }

    async getProductsByCategory(category: string) {
        return await productRepository.getProductsByCategory(category);
    }

    async updateProduct(id: string, data: UpdateProductDto) {
        const product = await productRepository.getProductById(id);
        if (!product) {
            throw new HttpError(404, "Product not found");
        }
        return await productRepository.updateProduct(id, data);
    }

    async deleteProduct(id: string) {
        const product = await productRepository.getProductById(id);
        if (!product) {
            throw new HttpError(404, "Product not found");
        }
        return await productRepository.deleteProduct(id);
    }

    async updateStock(id: string, quantity: number) {
        const product = await productRepository.getProductById(id);
        if (!product) {
            throw new HttpError(404, "Product not found");
        }
        if (product.stock < quantity) {
            throw new HttpError(400, "Insufficient stock");
        }
        return await productRepository.updateStock(id, quantity);
    }
}
