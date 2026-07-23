import z from 'zod';

export const AddToCartDto = z.object({
    product: z.string(),
    title: z.string(),
    image: z.string(),
    price: z.number(),
    quantity: z.number().min(1).optional().default(1)
});

export type AddToCartDTO = z.infer<typeof AddToCartDto>;

export const UpdateCartDto = z.object({
    quantity: z.number().min(0)
});

export type UpdateCartDTO = z.infer<typeof UpdateCartDto>;
