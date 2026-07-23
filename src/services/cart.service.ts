import { CartRepository } from "../repository/cart.repository";
import { HttpError } from "../errors/http-error";

const cartRepository = new CartRepository();

export class CartService {
    async getCart(userId: string) {
        let cart = await cartRepository.getCartByUser(userId);
        if (!cart) {
            cart = await cartRepository.createCart(userId);
        }
        return cart;
    }

    async addItemToCart(userId: string, data: any) {
        return await cartRepository.addItemToCart(userId, data);
    }

    async updateCartItem(userId: string, productId: string, data: any) {
        return await cartRepository.updateCartItem(userId, productId, data.quantity);
    }

    async removeItemFromCart(userId: string, productId: string) {
        return await cartRepository.removeItemFromCart(userId, productId);
    }

    async clearCart(userId: string) {
        return await cartRepository.clearCart(userId);
    }
}
