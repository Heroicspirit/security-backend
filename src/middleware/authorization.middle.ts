import jwt from "jsonwebtoken"; 
import { JWT_SECRET } from "../config";
import { Request, Response, NextFunction } from "express"; 
import { HttpError } from "../errors/http-error";
import { UserRepository } from "../repository/user.repository";
import { IUser } from "../models/user.model";

export interface AuthRequest extends Request {
  user: IUser;
}

const userRepository = new UserRepository(); 

export const authorizedMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            throw new HttpError(401, "Unauthorized, Please login first");
        }

        const token = authHeader.split(" ")[1]; 
        
        const decodedToken = jwt.verify(token, JWT_SECRET) as Record<string, any>; 
        
        if (!decodedToken || !decodedToken.id) {
            throw new HttpError(401, "Invalid session, please login again");
        }

        const user = await userRepository.getUserById(decodedToken.id); 
        if (!user) {
            throw new HttpError(401, "User no longer exists");
        }

        req.user = user; 
        next(); 

    } catch (error: any) {
        const message = error.name === "TokenExpiredError" ? "Session expired" : error.message;
        return res.status(401).json({
            success: false, 
            message: message || "Unauthorized"
        });
    }
};

export const adminMiddleware = async (
    req: AuthRequest, res: Response, next: NextFunction
) => {
    try {
        if (!req.user) {
            throw new HttpError(401, 'Unauthorized no user info');
        }
        if (req.user.role !== 'admin') {
            throw new HttpError(403, 'Forbidden not admin');
        }
        return next();
    } catch (err: Error | any) {
        return res.status(err.statusCode || 500).json(
            { success: false, message: err.message }
        )
    }
}
