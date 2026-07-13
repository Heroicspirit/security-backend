import { IUser, UserModel } from "../models/user.model";
import { FilterQuery } from "mongoose";
export interface IUserRepository {
    createdUser(Data: Partial<IUser>): Promise<IUser>;
    getUserByName(name: string): Promise<IUser | null >;
    getUserByEmail(email: string): Promise<IUser| null >;
    getUserById(id: string): Promise<IUser | null>;
    getAllUsers(page: number, size: number, search?: string): Promise<{user:IUser [], total: number}>;
    updateOneUser(id: string, data: Partial<IUser>): Promise<IUser | null>;
    deleteOneUser(id: string): Promise<boolean | null>;

    updateUser(id: string, updateData: Partial<IUser>): Promise<IUser | null>;
    deleteUser(id: string): Promise<boolean>;
}
export class UserRepository implements IUserRepository {
    async createdUser(data: Partial<IUser>): Promise<IUser> {
        const user = new UserModel(data);
        return await user.save();
    }
    async getUserByName(name: string): Promise<IUser | null> {
        const user = await UserModel.findOne({"name":name});
        return user;
    }
    async getUserByEmail(email: string): Promise<IUser | null> {
        const user = await UserModel.findOne({"email":email});
        return user;
    }
    async getUserById(id: string): Promise<IUser | null> {
        const user = await UserModel.findById(id);
        return user;
    }
    async getAllUsers(
        page: number, size: number, search?: string
    ): Promise<{user: IUser[], total: number}> {
        const filter: FilterQuery<IUser> = {};
        if (search) {
            filter.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { firstName: { $regex: search, $options: 'i' } },
                { lastName: { $regex: search, $options: 'i' } },
            ];
        }
        const [user, total] = await Promise.all([
            UserModel.find(filter)
                .skip((page -1)* size)
                .limit(size),
            UserModel.countDocuments(filter)
        ]);
        return { user, total};
        
    }
    async updateOneUser(id: string, data: Partial<IUser>): Promise<IUser | null> {
        const updateUser = await UserModel.findByIdAndUpdate(id, data, { new: true});
        return updateUser;
    }
    async deleteOneUser(id: string): Promise<boolean | null> {
        const result = await UserModel.findByIdAndDelete(id);
        return result ? true: null;
    }
    async updateUser(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
        
        const updatedUser = await UserModel.findByIdAndUpdate(
            id, updateData, { new: true }
        );
        return updatedUser;
    }
    async deleteUser(id: string): Promise<boolean> {
        const result = await UserModel.findByIdAndDelete(id);
        return result ? true : false;
    }
}
    
