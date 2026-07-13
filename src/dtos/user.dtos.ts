import z from 'zod';
import { UserSchema } from '../types/user.type';

export const CreateUserDTO = z.object({
    name: z.string().min(2, "Full name is required").optional(),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
    role: z.enum(["user", "admin"]).optional().default("user"),
    profilePicture: z.string().optional()
}).extend({
    confirmPassword: z.string().min(6),
}).refine(
    (data) => data.password === data.confirmPassword,
    {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    }
).transform((data) => {
    if (data.name) {
        return {
            ...data,
            name: data.name
        };
    }
    return data;
});
export type createUserDto = z.infer<typeof CreateUserDTO>;


export const LoginUserDto = z.object({
    email: z.string().min(6),
    password: z.string().min(6),
})
export type LoginUserDto = z.infer<typeof LoginUserDto>

export const UpdateUserDto = z.object({
    name: z.string().min(2, "Full name is required").optional(),
    email: z.string().email("Invalid email format").optional(),
    password: z.string().min(6, "Password must be at least 6 characters").optional(),
    profilePicture: z.string().optional()
});

export type UpdateUserDto = z.infer<typeof UpdateUserDto>;
