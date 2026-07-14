import z from 'zod';
import { UserSchema } from '../types/user.type';

export const CreateUserDTO = z.object({
    name: z.string().min(2, "Full name is required").optional(),
    email: z.string().email("Invalid email format"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
    confirmPassword: z.string().min(8, "Confirm password is required"),
    role: z.enum(["user", "admin"]).optional().default("user"),
    profilePicture: z.string().optional()
}).extend({
    confirmPassword: z.string().min(8),
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
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must not exceed 128 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number")
        .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")
        .optional(),
    profilePicture: z.string().optional()
});

export type UpdateUserDto = z.infer<typeof UpdateUserDto>;

export const EnableMfaDto = z.object({
    token: z.string().min(6, "Token must be 6 digits").max(6, "Token must be 6 digits"),
});
export type EnableMfaDto = z.infer<typeof EnableMfaDto>;

export const VerifyMfaDto = z.object({
    token: z.string().min(6, "Token must be 6 digits").max(6, "Token must be 6 digits"),
});
export type VerifyMfaDto = z.infer<typeof VerifyMfaDto>;
