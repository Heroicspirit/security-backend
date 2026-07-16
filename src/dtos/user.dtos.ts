import z from 'zod';
import { UserSchema } from '../types/user.type';
import { PasswordPolicy } from '../utils/passwordPolicy';

const passwordSchema = PasswordPolicy.getZodSchema();

export const CreateUserDTO = z.object({
    name: z.string().min(2, "Full name is required").optional(),
    email: z.string().email("Invalid email format"),
    password: passwordSchema,
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
    password: passwordSchema.optional(),
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
