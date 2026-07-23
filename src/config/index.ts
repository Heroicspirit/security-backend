import dotenv from 'dotenv';
dotenv.config();

export const PORT: number = 
process.env.PORT ? parseInt(process.env.PORT) : 5001;
export const MONGODB_URI: string =
process.env.MONGODB_URI || process.env.MONGODB_URL || 'mongodb://localhost:27017/security';
export const JWT_SECRET: string = 
process.env.JWT_SECRET || 'default_secret';
export const CLIENT_URL: string =
process.env.CLIENT_URL || 'http://localhost:3001';
export const ENCRYPTION_KEY: string = 
process.env.ENCRYPTION_KEY || 'default_encryption_key_change_in_production_32chr';
