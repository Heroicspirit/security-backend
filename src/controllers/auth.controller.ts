import { CreateUserDTO, LoginUserDto, UpdateUserDto } from "../dtos/user.dtos";
import { UserService } from "../services/user.service";
import { Request, Response } from "express";
import passport from "../config/passport";

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
            return res.status(201).json(
                    ( {success: true, data: newUser, message: (" Register success") } )
                );
            
        } catch (error: Error | any ) {
            return res.status(error.statusCode || 500).json(
                    ( {success: false, message: error.message || " Internal Server Error" } )
            );
        }
    }
    async login(req: Request, res: Response) {
        try {
            const parsedData = LoginUserDto.safeParse(req.body);
            if(!parsedData.success) {
                return res.status(400).json(
                    { success: false, message: "Validation Error", errors: parsedData.error.flatten().fieldErrors }
                );
            }
                const { token, existingUser } = await userService.loginUser(parsedData.data);
                return res.status(200).json(
                    { success: true, data: existingUser, token, message:" Login success"}
                );
            } catch (error: Error | any) {
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
            const user = await userService.sendResetPasswordEmail(email);
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
            await userService.resetPassword(token, newPassword);
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
                return res.redirect(`${process.env.CLIENT_URL}/login?error=google_auth_failed`);
            }

            // Generate JWT token
            const token = userService.generateToken(user.id, user.email, user.role);

            // Redirect to frontend with token
            res.redirect(`${process.env.CLIENT_URL}/user/dashboard?token=${token}`);
        })(req, res);
    };

    // Admin user management
    async getAllUsers(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const size = parseInt(req.query.size as string) || 10;
            const search = req.query.search as string;
            
            const result = await userService.getAllUsers(page, size, search);
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

    async getUserById(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const user = await userService.getUserById(userId);
            return res.status(200).json({
                success: true,
                data: user
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async updateUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            const parsedData = UpdateUserDto.safeParse(req.body);
            if (!parsedData.success) {
                return res.status(400).json({
                    success: false,
                    message: "Validation Error",
                    errors: parsedData.error.flatten().fieldErrors
                });
            }
            const updatedUser = await userService.updateUser(userId, parsedData.data);
            return res.status(200).json({
                success: true,
                data: updatedUser,
                message: "User updated successfully"
            });
        } catch (error: Error | any) {
            return res.status(error.statusCode || 500).json({
                success: false,
                message: error.message || "Internal Server Error"
            });
        }
    }

    async deleteUser(req: Request, res: Response) {
        try {
            const { userId } = req.params;
            await userService.deleteUser(userId);
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
}
