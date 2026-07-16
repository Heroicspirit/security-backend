import { createUserDto, LoginUserDto, UpdateUserDto, EnableMfaDto, VerifyMfaDto } from "../dtos/user.dtos";
import { UserRepository } from "../repository/user.repository";
import bcryptjs from "bcryptjs";
import { HttpError } from "../errors/http-error";
import  jwt  from "jsonwebtoken";
import { JWT_SECRET } from "../config";
import { sendEmail } from "../config/email";
import speakeasy from "speakeasy";
import QRCode from "qrcode";
import { PasswordPolicy, PASSWORD_POLICY } from "../utils/passwordPolicy";




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
        
        // Validate password against policy
        const passwordValidation = PasswordPolicy.validate(data.password, { email: data.email, name: data.name });
        if (!passwordValidation.isValid) {
            throw new HttpError(400, passwordValidation.errors.join(', '));
        }
        
        const hashedPassword = await bcryptjs.hash(data.password,10);
        data.password = hashedPassword;
        const newUser =await userRepository.createdUser({
            ...data,
            passwordHistory: [hashedPassword],
            passwordLastChanged: new Date(),
            passwordExpiryDays: PASSWORD_POLICY.expiryDays
        });
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
        
        // Check password expiry
        if (existingUser.passwordLastChanged) {
            const daysSinceChange = Math.floor((Date.now() - new Date(existingUser.passwordLastChanged).getTime()) / (1000 * 60 * 60 * 24));
            const expiryDays = existingUser.passwordExpiryDays || PASSWORD_POLICY.expiryDays;
            if (daysSinceChange >= expiryDays) {
                throw new HttpError(403, "Password has expired. Please reset your password.");
            }
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
            // Validate password against policy
            const passwordValidation = PasswordPolicy.validate(data.password, { email: user.email, name: user.name });
            if (!passwordValidation.isValid) {
                throw new HttpError(400, passwordValidation.errors.join(', '));
            }
            
            // Check password history
            const passwordHistory = user.passwordHistory || [];
            const isInHistory = await PasswordPolicy.checkPasswordHistory(
                userId,
                data.password,
                passwordHistory,
                bcryptjs.compare
            );
            if (isInHistory) {
                throw new HttpError(400, `Cannot reuse a password from the last ${PASSWORD_POLICY.historyCount} passwords`);
            }
            
            const hashedPassword = await bcryptjs.hash(data.password, 10);
            data.password = hashedPassword;
            
            // Update password history
            const newHistory = [hashedPassword, ...passwordHistory].slice(0, PASSWORD_POLICY.historyCount);
            await userRepository.updateUser(userId, {
                passwordHistory: newHistory,
                passwordLastChanged: new Date()
            });
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
            
            // Validate password against policy
            const passwordValidation = PasswordPolicy.validate(newPassword, { email: user.email, name: user.name });
            if (!passwordValidation.isValid) {
                throw new HttpError(400, passwordValidation.errors.join(', '));
            }
            
            // Check password history
            const passwordHistory = user.passwordHistory || [];
            const isInHistory = await PasswordPolicy.checkPasswordHistory(
                userId,
                newPassword,
                passwordHistory,
                bcryptjs.compare
            );
            if (isInHistory) {
                throw new HttpError(400, `Cannot reuse a password from the last ${PASSWORD_POLICY.historyCount} passwords`);
            }
            
            const hashedPassword = await bcryptjs.hash(newPassword, 10);
            
            // Update password history
            const newHistory = [hashedPassword, ...passwordHistory].slice(0, PASSWORD_POLICY.historyCount);
            await userRepository.updateUser(userId, { 
                password: hashedPassword,
                passwordHistory: newHistory,
                passwordLastChanged: new Date()
            });
            return user;
        } catch (error) {
            throw new HttpError(400, "Invalid or expired token");
        }
    }

    async generateMfaSecret(userId: string) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }

        if (user.mfaEnabled) {
            throw new HttpError(400, "MFA is already enabled");
        }

        const secret = speakeasy.generateSecret({
            name: `SecurityApp (${user.email})`,
            issuer: "SecurityApp",
        });

        await userRepository.updateUser(userId, { mfaSecret: secret.base32 });

        const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url || "");

        return {
            secret: secret.base32,
            qrCode: qrCodeUrl,
            message: "Scan the QR code with your authenticator app"
        };
    }

    async enableMfa(userId: string, data: EnableMfaDto) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }

        if (!user.mfaSecret) {
            throw new HttpError(400, "MFA secret not found. Please generate a secret first.");
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: "base32",
            token: data.token,
        });

        if (!verified) {
            throw new HttpError(400, "Invalid token. Please try again.");
        }

        await userRepository.updateUser(userId, { mfaEnabled: true });

        return { message: "MFA enabled successfully" };
    }

    async verifyMfa(userId: string, data: VerifyMfaDto) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }

        if (!user.mfaEnabled || !user.mfaSecret) {
            throw new HttpError(400, "MFA is not enabled for this account");
        }

        const verified = speakeasy.totp.verify({
            secret: user.mfaSecret,
            encoding: "base32",
            token: data.token,
        });

        if (!verified) {
            throw new HttpError(400, "Invalid token");
        }

        return { verified: true };
    }

    async disableMfa(userId: string) {
        const user = await userRepository.getUserById(userId);
        if (!user) {
            throw new HttpError(404, "User not found");
        }

        await userRepository.updateUser(userId, {
            mfaEnabled: false,
            mfaSecret: undefined
        });

        return { message: "MFA disabled successfully" };
    }
}
