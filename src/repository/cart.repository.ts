import { CartModel, ICart } from "../models/cart.model";

export class CartRepository {
    async getCartByUser(userId: string) {
        return await CartModel.findOne({ user: userId }).populate('items.product');
    }

    async createCart(userId: string) {
        const cart = new CartModel({ user: userId, items: [] });
        return await cart.save();
    }

    async addItemToCart(userId: string, itemData: any) {
        let cart = await this.getCartByUser(userId);
        if (!cart) {
            cart = await this.createCart(userId);
        }

        const existingItemIndex = cart.items.findIndex(
            (item: any) => item.product.toString() === itemData.product
        );

        if (existingItemIndex > -1) {
            cart.items[existingItemIndex].quantity += itemData.quantity || 1;
        } else {
            cart.items.push(itemData);
        }

        return await cart.save();
    }

    async updateCartItem(userId: string, productId: string, quantity: number) {
        const cart = await this.getCartByUser(userId);
        if (!cart) {
            throw new Error("Cart not found");
        }

        const itemIndex = cart.items.findIndex(
            (item: any) => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            throw new Error("Item not found in cart");
        }

        if (quantity <= 0) {
            cart.items.splice(itemIndex, 1);
        } else {
            cart.items[itemIndex].quantity = quantity;
        }

        return await cart.save();
    }

    async removeItemFromCart(userId: string, productId: string) {
        const cart = await this.getCartByUser(userId);
        if (!cart) {
            throw new Error("Cart not found");
        }

        cart.items = cart.items.filter(
            (item: any) => item.product.toString() !== productId
        );

        return await cart.save();
    }

    async clearCart(userId: string) {
        const cart = await this.getCartByUser(userId);
        if (!cart) {
            throw new Error("Cart not found");
        }

        cart.items = [];
        return await cart.save();
    }
}
