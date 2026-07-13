import mongoose, { Document, Schema} from "mongoose";

const UserSchema: Schema = new Schema({
    name: {type: String, required: true, minlength:3},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: false, minlength:6},
    googleId: {type: String, required: false, unique: true, sparse: true},
    role: { type: String, enum: [ 'admin','user'], default: 'user'},
    profilePicture: {type: String, default: null},
    favoriteSongs: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
},{
    timestamps: true,
});

export interface IUser extends Document {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
    password: string;
    role: 'admin' | 'user';
    profilePicture?: string;
    favoriteSongs: mongoose.Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

export const UserModel = mongoose.model<IUser>('User',UserSchema)