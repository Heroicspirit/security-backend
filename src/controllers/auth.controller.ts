import { CreateUserDTO, LoginUserDto, UpdateUserDto, EnableMfaDto, VerifyMfaDto } from "../dtos/user.dtos";
import { UserService } from "../services/user.service";
import { Request, Response } from "express";
import passport from "../config/passport";
import { AuthRequest } from "../middleware/authorization.middle";
import { CLIENT_URL } from "../config";
import { PasswordPolicy } from "../utils/passwordPolicy";
import { sanitizeUser } from "../utils/sanitizeUser";
import { securityLogger } from "../utils/securityLogger";

let userService = new UserService();
export class AuthController{
    async register(req: Request, res: Response) {
        try {
            const parsedData = CreateUserDTO.safeParse(req.body);
            if( !parsedData.success) {
                return res.status(400).json(
                    ( {success: false, message: "Validation Error", errors: parsedData.error.flatten().fieldErrors} )
                );
            }
            const newUser = await userService.registerUser(parsedData.data);
            // Log registration
            const ip = req.ip || req.socket.remoteAddress;
            const userAgent = req.headers['user-agent'];
            securityLogger.logRegistration(newUser._id.toString(), newUser.email, ip);
            
            return res.status(201).json(
                    ( {success: true, data: sanitizeUser(newUser), message: (" Register success") } )
                );
            
        } catch (error: Error | any ) {
            return res.status(error.statusCode || 500).json(
                    ( {success: false, message: error.message || " Internal Server Error" } )
            );
        }
    }
    async login(req: Request, res: Response) {
        const ip = req.ip || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'];
        const email = req.body.email;
        
        try {
            const parsedData = LoginUserDto.safeParse(req.body);
            if(!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: "Validation Error", errors: parsedData.error.flatten().fieldErrors }
                );
            }
                const { token, existingUser } = await userService.loginUser(parsedData.data);
                // Log successful login
                securityLogger.logLoginSuccess(existingUser._id.toString(), existingUser.email, ip, userAgent);
                
                return res.status(200).json(
                    { success: true, data: sanitizeUser(existingUser), token, message:" Login success"}
                );
            } catch (error: Error | any) {
                // Log failed login
                securityLogger.logLoginFailed(email, ip, userAgent, error.message);
                
                return res.status(error.statusCode || 500).json(
                    {success: false, message:error.message || "Internet Server Error"}
                );
        }
    }

    
    updateProfile = async (req: Request, res: Response) => {
        try {
            const userId = (req as any).user?.id;
            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: "User Id Not found"
                });
            }

            const parsedData = UpdateUserDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            const updatedUser = await userService.updateUser(userId, parsedData.data);

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: "User not found or update failed"
                });
            }

            return res.status(200).json({
                success: true,
                data: updatedUser,
                filename: (req as any).file ? (req as any).file.filename : 
                        ((req as any).files && Array.isArray((req as any).files) && (req as any).files.length > 0) ? (req as any).files[0].filename : 
                        updatedUser.profilePicture,
                message: "User profile updated successfully"
            });
        } catch (error: any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }
    async sendResetPasswordEmail(req: Request, res: Response) {
        try {
            const email = req.body.email;
            const ip = req.ip || req.socket.remoteAddress;
            const user = await userService.sendResetPasswordEmail(email);
            // Log password reset request
            securityLogger.logPasswordResetRequest(email, ip);
            
            return res.status(200).json(
                {
                    success: true,
                    data: user,
                    message: "If the email is registered, a reset link has been sent."
                }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    async resetPassword(req: Request, res: Response) {
        try {
            const token = req.params.token as string;
            const { newPassword } = req.body;
            const ip = req.ip || req.socket.remoteAddress;
            const user = await userService.resetPassword(token, newPassword);
            // Log password reset success
            securityLogger.logPasswordResetSuccess(user._id.toString(), user.email, ip);
            
            return res.status(200).json(
                { success: true, message: "Password has been reset successfully." }
            );
        } catch (error: Error | any) {
            return res.status(error.statusCode ?? 500).json(
                { success: false, message: error.message || "Internal Server Error" }
            );
        }
    }

    // Google OAuth
    googleAuth = passport.authenticate("google", { scope: ["profile", "email"] });

    googleAuthCallback = (req: Request, res: Response) => {
        passport.authenticate("google", { failureRedirect: "/login" }, (err: any, user: any) => {
            if (err || !user) {
                return res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
            }

            // Generate JWT token
            const token = userService.generateToken(user.id, user.email, user.role);

            // Redirect to frontend with token
            res.redirect(`${CLIENT_URL}/user/dashboard?token=${token}`);
        })(req, res);
    };

    // Admin user management
    async getAllUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const search = req.query.search as string;
            
            const result = await userService.getAllUsers(page, size, search);
            // Sanitize user data in the result
            if (result.user && Array.isArray(result.user)) {
                result.user = result.user.map((user: any) => sanitizeUser(user, true));
            }
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async getUserById(req: AuthRequest, res: Response) {
        try {
            const { userId } = req.params;
            const requestingUserId = req.user._id.toString();
            
            // IDOR Protection: Only allow users to access their own data or admins to access any data
            if (requestingUserId !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only view your own profile."
                });
            }
            
            const user = await userService.getUserById(userId);
            return res.status(200).json({
                success: true,
                data: sanitizeUser(user, req.user.role === 'admin')
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async updateUser(req: AuthRequest, res: Response) {
        try {
            const { userId } = req.params;
            const requestingUserId = req.user._id.toString();
            
            // IDOR Protection: Only allow users to update their own data or admins to update any data
            if (requestingUserId !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only update your own profile."
                });
            }
            
            const parsedData = UpdateUserDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            
            // Mass Assignment Protection: Filter sensitive fields for non-admin users
            const sensitiveFields = ['role', 'mfaEnabled', 'mfaSecret', 'passwordHistory', 'passwordLastChanged', 'passwordExpiryDays', 'failedLoginAttempts', 'lockUntil', 'lastFailedLogin', 'googleId', 'favoriteSongs'];
            const sanitizedData: any = { ...parsedData.data };
            
            if (req.user.role !== 'admin') {
                sensitiveFields.forEach(field => {
                    delete sanitizedData[field];
                });
            }
            
            const updatedUser = await userService.updateUser(userId, sanitizedData);
            // Log profile update
            const ip = req.ip || req.socket.remoteAddress;
            securityLogger.logProfileUpdate(userId, req.user.email, ip);
            
            return res.status(200).json({
                success: true,
                data: sanitizeUser(updatedUser, req.user.role === 'admin'),
                message: "User updated successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async deleteUser(req: AuthRequest, res: Response) {
        try {
            const { userId } = req.params;
            const requestingUserId = req.user._id.toString();
            
            // IDOR Protection: Only allow users to delete their own account or admins to delete any account
            if (requestingUserId !== userId && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: "Access denied. You can only delete your own account."
                });
            }
            
            await userService.deleteUser(userId);
            // Log admin action for user deletion
            const ip = req.ip || req.socket.remoteAddress;
            securityLogger.logAdminAction(userId, req.user.email, 'DELETE_USER', ip, { deletedUserId: userId });
            
            return res.status(200).json({
                success: true,
                message: "User deleted successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    // MFA endpoints
    async generateMfaSecret(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
            }

            const result = await userService.generateMfaSecret(userId);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async enableMfa(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
            }

            const parsedData = EnableMfaDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }

            const result = await userService.enableMfa(userId, parsedData.data);
            // Log MFA enable
            const ip = req.ip || req.socket.remoteAddress;
            securityLogger.logMfaEnabled(userId, req.user.email, ip);
            
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async verifyMfa(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
            }

            const parsedData = VerifyMfaDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }

            const result = await userService.verifyMfa(userId, parsedData.data);
            // Log MFA verification success
            const ip = req.ip || req.socket.remoteAddress;
            securityLogger.logLoginSuccess(userId, req.user.email, ip, req.headers['user-agent']);
            
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async disableMfa(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "User not authenticated"
                });
            }

            const result = await userService.disableMfa(userId);
            // Log MFA disable
            const ip = req.ip || req.socket.remoteAddress;
            securityLogger.logMfaDisabled(userId, req.user.email, ip);
            
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async checkPasswordStrength(req: Request, res: Response) {
        try {
            const { password } = req.body;
            if (!password) {
                return res.status(400).json({
                    success: false,
                    message: "Password is required"
                });
            }

            const result = PasswordPolicy.calculateStrength(password);
            return res.status(200).json({
                success: true,
                data: result
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }
}
