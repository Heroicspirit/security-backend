import z from 'zod';

export const CreateOrderDto = z.object({
    user: z.string().optional(),
    items: z.array(z.object({
        product: z.string(),
        title: z.string(),
        image: z.string(),
        price: z.number(),
        quantity: z.number().min(1)
    })).min(1, "At least one item is required"),
    shippingAddress: z.object({
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        phone: z.string().min(1, "Phone number is required"),
        city: z.string().min(1, "City is required"),
        address: z.string().min(1, "Address is required")
    }),
    paymentMethod: z.enum(['cod', 'khalti', 'imepay']),
    subtotal: z.number().positive(),
    shippingCost: z.number().min(0).optional(),
    total: z.number().positive()
});

export type CreateOrderDTO = z.infer<typeof CreateOrderDto>;

export const UpdateOrderStatusDto = z.object({
    status: z.enum(['confirmed', 'processing', 'shipped', 'delivered', 'cancelled'])
});

export type UpdateOrderStatusDTO = z.infer<typeof UpdateOrderStatusDto>;
