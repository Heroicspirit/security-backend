import mongoose, { Document, Schema} from "mongoose";

const UserSchema: Schema = new Schema({
    name: {type: String, required: true, minlength:3},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: false, minlength:8},
    googleId: {type: String, required: false, unique: true, sparse: true},
    role: { type: String, enum: [ 'admin','user'], default: 'user'},
    profilePicture: {type: String, default: null},
    favoriteSongs: [{ type: Schema.Types.ObjectId, ref: 'Song' }],
    mfaEnabled: {type: Boolean, default: false},
    mfaSecret: {type: String, required: false},
    passwordHistory: {type: [String], default: []},
    passwordLastChanged: {type: Date, default: Date.now},
    passwordExpiryDays: {type: Number, default: 90},
    failedLoginAttempts: {type: Number, default: 0},
    lockUntil: {type: Date, default: null},
    lastFailedLogin: {type: Date, default: null},
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
    mfaEnabled: boolean;
    mfaSecret?: string;
    passwordHistory: string[];
    passwordLastChanged: Date;
    passwordExpiryDays: number;
    failedLoginAttempts: number;
    lockUntil?: Date;
    lastFailedLogin?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export const UserModel = mongoose.model<IUser>('User',UserSchema)