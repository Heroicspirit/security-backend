import dotenv from 'dotenv';
dotenv.config();

export const PORT: number = 
process.env.PORT ? parseInt(process.env.PORT) : 5001;
export const MONGODB_URI: string =
process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/motoparts';
export const JWT_SECRET: string = 
process.env.JWT_SECRET || 'default_secret';
