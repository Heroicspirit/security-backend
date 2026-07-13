import { createUserDto, LoginUserDto, UpdateUserDto } from "../dtos/user.dtos";
import { UserRepository } from "../repository/user.repository";
import bcryptjs from "bcryptjs";
import { HttpError } from "../errors/http-error";
import  jwt  from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { sendEmail } from "../config/email";




const userRepository = new UserRepository();
const CLIENT_URL = process.env.CLIENT_URL as string;

export class UserService {
    async registerUser(data: createUserDto) {
        const checkEmail = await userRepository.getUserByEmail(data.email);
        if(checkEmail) {
            throw new HttpError(403,"Email already in use");
        }
        if(data.name) {
            const checkName = await userRepository.getUserByName(data.name);
            if(checkName) {
                throw new HttpError(403,"Username already in use");
            }
        }
        const hashedPassword = await bcryptjs.hash(data.password,10);
        data.password = hashedPassword;
        const newUser =await userRepository.createdUser(data);
        return newUser;
    }
    generateToken(userId: any, email: string, role: string) {
        const payload = {
            id: userId.toString(),
            email,
            role
        };
        return jwt.sign(payload, JWT_SECRET, {expiresIn: '30d'});
    }

    async loginUser(data : LoginUserDto) {
        const existingUser = await userRepository.getUserByEmail(data.email);
        if(!existingUser) {
            throw new HttpError(404, "Email not found");
        }
        const isPasswordValid = await bcryptjs.compare(data.password, existingUser.password);
        if(!isPasswordValid) {
            throw new HttpError(401, "Invalid credentials");
        }
        const token = this.generateToken(existingUser._id, existingUser.email, existingUser.role);
        return { token, existingUser}
    }

    async updateUserProfile(userId: string, updateData: any) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }

        const updatedUser = await userRepository.updateOneUser(userId, updateData);
        return updatedUser;
    }

    async updateUser(userId: string, data: UpdateUserDto) {
        const user = await userRepository.getUserById(userId);
        if(!user){
            throw new HttpError(404, "User not found");
        }if(user.email !==data.email){
            const emailExists = await userRepository.getUserByEmail(data.email!);
            if(emailExists){
                throw new HttpError(403, "Email already exists");
            }
        }
        if(user.name !== data.name){
            const nameExists = await userRepository.getUserByName(data.name!);
            if(nameExists){
                throw new HttpError(403, "Username already in use");
            }
        }
        if(data.password){
            const hashedPassword = await bcryptjs.hash(data.password, 10);
            data.password = hashedPassword;
        }
        const updatedUser = await userRepository.updateOneUser(userId, data);
        return updatedUser;
    }
    async getUserById(userId: string) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }
        return user;
    }
    async getAllUsers(
        page: number = 1,
        size: number = 10,
        search?: string
    ) {
        return await userRepository.getAllUsers(page, size, search);
        }

    
    async deleteUser(userId: string) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }

        const result = await userRepository.deleteOneUser(userId);
        return result;
    }

    async sendResetPasswordEmail(email?: string) {
        if (!email) {
            throw new HttpError(400, "Email is required");
        }
        const user = await userRepository.getUserByEmail(email);
        if (!user) {
            throw new HttpError(404, "User not found");
        }
        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1h' });
        const resetLink = `${CLIENT_URL}/reset-password?token=${token}`;
        const html = `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`;
        await sendEmail(user.email, "Password Reset", html);
        return user;
    }

    async resetPassword(token?: string, newPassword?: string) {
        try {
            if (!token || !newPassword) {
                throw new HttpError(400, "Token and new password are required");
            }
            const decoded: any = jwt.verify(token, JWT_SECRET);
            const userId = decoded.id;
            const user = await userRepository.getUserById(userId);
            if (!user) {
                throw new HttpError(404, "User not found");
            }
            const hashedPassword = await bcryptjs.hash(newPassword, 10);
            await userRepository.updateUser(userId, { password: hashedPassword });
            return user;
        } catch (error) {
            throw new HttpError(400, "Invalid or expired token");
        }
    }
}
