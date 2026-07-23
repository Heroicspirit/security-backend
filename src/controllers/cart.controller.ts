import { AddToCartDto, UpdateCartDto } from "../dtos/cart.dtos";
import { CartService } from "../services/cart.service";
import { Request, Response } from "express";

const cartService = new CartService();

export class CartController {
    async getCart(req: Request, res: Response) {
        try {
            const userId = (req as any).authUser?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }
            const cart = await cartService.getCart(userId);
            return res.status(200).json({
                success: true,
                data: cart
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async addItemToCart(req: Request, res: Response) {
        try {
            const userId = (req as any).authUser?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }
            const parsedData = AddToCartDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            const cart = await cartService.addItemToCart(userId, parsedData.data);
            return res.status(200).json({
                success: true,
                data: cart,
                message: "Item added to cart"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async updateCartItem(req: Request, res: Response) {
        try {
            const userId = (req as any).authUser?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }
            const { productId } = req.params;
            const parsedData = UpdateCartDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            const cart = await cartService.updateCartItem(userId, productId, parsedData.data);
            return res.status(200).json({
                success: true,
                data: cart,
                message: "Cart item updated"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async removeItemFromCart(req: Request, res: Response) {
        try {
            const userId = (req as any).authUser?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }
            const { productId } = req.params;
            const cart = await cartService.removeItemFromCart(userId, productId);
            return res.status(200).json({
                success: true,
                data: cart,
                message: "Item removed from cart"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async clearCart(req: Request, res: Response) {
        try {
            const userId = (req as any).authUser?.id;
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }
            const cart = await cartService.clearCart(userId);
            return res.status(200).json({
                success: true,
                data: cart,
                message: "Cart cleared"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }
}
