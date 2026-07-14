import { CreateProductDTO, UpdateProductDTO } from "../dtos/product.dtos";
import { ProductService } from "../services/product.service";
import { Request, Response } from "express";

const productService = new ProductService();

export class ProductController {
    async createProduct(req: Request, res: Response) {
        try {
            const files = req.files as Express.Multer.File[];
            
            // Process uploaded files
            let imageUrls: string[] = [];
            if (files && files.length > 0) {
                imageUrls = files.map(file => `/uploads/${file.filename}`);
            }

            // Parse specs from JSON string if present
            let specs = req.body.specs;
            if (typeof specs === 'string') {
                try {
                    specs = JSON.parse(specs);
                } catch (e) {
                    specs = [];
                }
            }

            // Prepare product data with image URLs
            const productData = {
                ...req.body,
                image: imageUrls.length > 0 ? imageUrls[0] : req.body.image,
                images: imageUrls.length > 0 ? imageUrls : req.body.images,
                price: parseFloat(req.body.price),
                originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : undefined,
                stock: req.body.stock ? parseInt(req.body.stock) : 0,
                featured: req.body.featured === 'true' || req.body.featured === true,
                specs: specs
            };

            const parsedData = CreateProductDTO.safeParse(productData);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            const newProduct = await productService.createProduct(parsedData.data);
            return res.status(201).json({
                success: true,
                data: newProduct,
                message: "Product created successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getAllProducts(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const search = req.query.search as string;
            const category = req.query.category as string;
            
            const result = await productService.getAllProducts(page, size, search, category);
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

    async getProductById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const product = await productService.getProductById(id);
            return res.status(200).json({
                success: true,
                data: product
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getFeaturedProducts(req: Request, res: Response) {
        try {
            const products = await productService.getFeaturedProducts();
            return res.status(200).json({
                success: true,
                data: products
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getProductsByCategory(req: Request, res: Response) {
        try {
            const { category } = req.params;
            const products = await productService.getProductsByCategory(category);
            return res.status(200).json({
                success: true,
                data: products
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async updateProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const files = req.files as Express.Multer.File[];
            
            // Process uploaded files
            let imageUrls: string[] = [];
            if (files && files.length > 0) {
                imageUrls = files.map(file => `/uploads/${file.filename}`);
            }

            // Parse specs from JSON string if present
            let specs = req.body.specs;
            if (typeof specs === 'string') {
                try {
                    specs = JSON.parse(specs);
                } catch (e) {
                    specs = [];
                }
            }

            // Prepare product data with image URLs
            const productData = {
                ...req.body,
                image: imageUrls.length > 0 ? imageUrls[0] : req.body.image,
                images: imageUrls.length > 0 ? imageUrls : req.body.images,
                price: req.body.price ? parseFloat(req.body.price) : undefined,
                originalPrice: req.body.originalPrice ? parseFloat(req.body.originalPrice) : undefined,
                stock: req.body.stock !== undefined ? parseInt(req.body.stock) : undefined,
                featured: req.body.featured === 'true' || req.body.featured === true,
                specs: specs
            };

            const parsedData = UpdateProductDTO.safeParse(productData);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            const updatedProduct = await productService.updateProduct(id, parsedData.data);
            return res.status(200).json({
                success: true,
                data: updatedProduct,
                message: "Product updated successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async deleteProduct(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await productService.deleteProduct(id);
            return res.status(200).json({
                success: true,
                message: "Product deleted successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }
}
