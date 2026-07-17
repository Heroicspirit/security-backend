import { CreateUserDTO, LoginUserDto, UpdateUserDto, EnableMfaDto, VerifyMfaDto } from "../dtos/user.dtos";
import { UserService } from "../services/user.service";
import { Request, Response } from "express";
import passport from "../config/passport";
import { AuthRequest } from "../middleware/authorization.middle";
import { CLIENT_URL } from "../config";
import { PasswordPolicy } from "../utils/passwordPolicy";
import { sanitizeUser } from "../utils/sanitizeUser";
import { securityLogger } from "../utils/securityLogger";
import { captchaService } from "../utils/captcha";
import { bruteForceProtection } from "../middleware/bruteForce.middleware";
import { extractDeviceInfo } from "../utils/deviceFingerprint";

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

            // Validate CAPTCHA
            const captchaValid = captchaService.verifyCaptcha(parsedData.data.captchaSessionId, parsedData.data.captchaCode);
            if (!captchaValid) {
                // Record failed attempt for CAPTCHA failure
                bruteForceProtection.recordFailedAttempt(email);
                return res.status(400).json(
                    { success: false, message: "Invalid or expired CAPTCHA" }
                );
            }

                const { existingUser } = await userService.loginUser(parsedData.data);
                // Record successful login attempt
                bruteForceProtection.recordSuccessfulAttempt(email);
                // Log successful login
                securityLogger.logLoginSuccess(existingUser._id.toString(), existingUser.email, ip, userAgent);

                const sanitizedUser = sanitizeUser(existingUser.toObject());
                
                // Generate device info and tokens
                const deviceInfo = extractDeviceInfo(req);
                const accessToken = userService.generateAccessToken(existingUser._id, existingUser.email, existingUser.role);
                const refreshToken = await userService.createRefreshToken(existingUser._id.toString(), deviceInfo);

                // Set HttpOnly, Secure, SameSite=Strict cookies
                res.cookie('accessToken', accessToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 15 * 60 * 1000, // 15 minutes
                    path: '/'
                });

                res.cookie('refreshToken', refreshToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'strict',
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                    path: '/'
                });

                return res.status(200).json(
                    { success: true, data: sanitizedUser, message: "Login success" }
                );
            } catch (error: Error | any) {
                // Record failed login attempt
                bruteForceProtection.recordFailedAttempt(email);
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

    async generateCaptcha(req: Request, res: Response) {
        try {
            const sessionId = captchaService.generateSessionId();
            const { code, image } = captchaService.generateCaptcha(sessionId);

            return res.status(200).json({
                success: true,
                data: {
                    sessionId,
                    image
                }
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async exportProfile(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            const ip = req.ip || req.socket.remoteAddress;

            const profileData = await userService.exportProfile(userId);

            // Log profile export
            securityLogger.logProfileExport(userId, req.user.email, ip);

            return res.status(200).json({
                success: true,
                data: profileData
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async importProfile(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            const ip = req.ip || req.socket.remoteAddress;
            const { name, profilePicture, favoriteSongs } = req.body;

            const updatedUser = await userService.importProfile(userId, { name, profilePicture, favoriteSongs });

            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Log profile import with the actual fields that were updated
            const importedFields = ['name', 'profilePicture', 'favoriteSongs'].filter(f => req.body[f] !== undefined);
            securityLogger.logProfileImport(userId, req.user.email, ip, { fields: importedFields });

            return res.status(200).json({
                success: true,
                data: sanitizeUser(updatedUser.toObject()),
                message: "Profile imported successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async refreshToken(req: Request, res: Response) {
        try {
            const refreshToken = req.cookies.refreshToken;
            
            if (!refreshToken) {
                return res.status(401).json({
                    success: false,
                    message: "Refresh token not found"
                });
            }

            const tokenData = await userService.verifyRefreshToken(refreshToken);
            const user = await userService.getUserById(tokenData.userId.toString());

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }

            // Verify device binding
            const currentDeviceInfo = extractDeviceInfo(req);
            if (currentDeviceInfo.deviceFingerprint !== tokenData.deviceInfo.deviceFingerprint) {
                await userService.revokeRefreshToken(refreshToken);
                securityLogger.logSecurityEvent(user._id.toString(), user.email, req.ip, 'DEVICE_MISMATCH_REFRESH_TOKEN');
                return res.status(403).json({
                    success: false,
                    message: "Device verification failed"
                });
            }

            // Generate new tokens
            const newAccessToken = userService.generateAccessToken(user._id, user.email, user.role);
            const newRefreshToken = await userService.createRefreshToken(user._id.toString(), currentDeviceInfo);

            // Revoke old refresh token
            await userService.revokeRefreshToken(refreshToken);

            // Set new cookies
            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000,
                path: '/'
            });

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 30 * 24 * 60 * 60 * 1000,
                path: '/'
            });

            return res.status(200).json({
                success: true,
                message: "Token refreshed successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async logout(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            const refreshToken = req.cookies.refreshToken;
            const ip = req.ip || req.socket.remoteAddress;

            // Revoke the specific refresh token
            if (refreshToken) {
                await userService.revokeRefreshToken(refreshToken);
            }

            // Clear cookies
            res.clearCookie('accessToken', { path: '/' });
            res.clearCookie('refreshToken', { path: '/' });

            // Log logout
            securityLogger.logLogout(userId, req.user.email, ip);

            return res.status(200).json({
                success: true,
                message: "Logout successful"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async logoutAll(req: AuthRequest, res: Response) {
        try {
            const userId = req.user._id.toString();
            const ip = req.ip || req.socket.remoteAddress;

            // Revoke all refresh tokens for the user
            await userService.revokeAllUserTokens(userId);

            // Clear cookies
            res.clearCookie('accessToken', { path: '/' });
            res.clearCookie('refreshToken', { path: '/' });

            // Log logout all
            securityLogger.logSecurityEvent(userId, req.user.email, ip, 'LOGOUT_ALL_DEVICES');

            return res.status(200).json({
                success: true,
                message: "Logged out from all devices"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }
}
