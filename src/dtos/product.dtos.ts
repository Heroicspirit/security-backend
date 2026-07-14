import z from 'zod';

export const CreateProductDTO = z.object({
    title: z.string().min(1, "Title is required"),
    brand: z.string().min(1, "Brand is required"),
    category: z.string().min(1, "Category is required"),
    price: z.number().positive("Price must be positive"),
    originalPrice: z.number().positive().optional(),
    discountBadge: z.string().optional(),
    description: z.string().optional(),
    image: z.string().optional(),
    images: z.array(z.string()).min(1, "At least one image is required"),
    rating: z.number().min(0).max(5).optional(),
    reviewsCount: z.number().min(0).optional(),
    specs: z.array(z.object({
        label: z.string(),
        value: z.string()
    })).optional(),
    stock: z.number().min(0).default(0),
    featured: z.boolean().default(false)
});

export type CreateProductDto = z.infer<typeof CreateProductDTO>;

export const UpdateProductDTO = CreateProductDTO.partial();

export type UpdateProductDto = z.infer<typeof UpdateProductDTO>;
