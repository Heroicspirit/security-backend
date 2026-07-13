import z from 'zod';
import { Types } from 'mongoose';

export const UserSchema = z.object({
    name:z.string().min(3),
    email: z.string().min(6),
    password:z.string().min(6),
    profilePicture: z.string().optional(),
    role: z.enum(['admin','user']).default('user'),
    favoriteSongs: z.array(z.string()).optional(),
});

export type UserType = z.infer<typeof UserSchema> & {
    favoriteSongs?: Types.ObjectId[];
};
