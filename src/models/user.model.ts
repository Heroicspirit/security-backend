import mongoose, { Document, Schema} from "mongoose";

const UserSchema: Schema = new Schema({
    name: {type: String, required: true, minlength:3},
    email: {type: String, required: true, unique: true},
    password: {type: String, required: false, minlength:8},
    googleId: {type: String, required: false, unique: true, sparse: true},
    role: { type: String, enum: [ 'admin','user'], default: 'user'},
    profilePicture: {type: String, default: null},
    mfaEnabled: {type: Boolean, default: false},
    mfaSecret: {type: String, required: false},
    passwordHistory: {type: [String], default: []},
    passwordLastChanged: {type: Date, default: Date.now},
    passwordExpiryDays: {type: Number, default: 90},
    failedLoginAttempts: {type: Number, default: 0},
    lockUntil: {type: Date, default: null},
    lastFailedLogin: {type: Date, default: null},
    // Device/Session binding fields
    devices: [{
        deviceFingerprint: { type: String, required: true },
        userAgent: { type: String, required: true },
        lastUsed: { type: Date, default: Date.now },
        isTrusted: { type: Boolean, default: false }
    }],
    currentDeviceFingerprint: { type: String, default: null }
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
    mfaEnabled: boolean;
    mfaSecret?: string;
    passwordHistory: string[];
    passwordLastChanged: Date;
    passwordExpiryDays: number;
    failedLoginAttempts: number;
    lockUntil?: Date;
    lastFailedLogin?: Date;
    devices: Array<{
        deviceFingerprint: string;
        userAgent: string;
        lastUsed: Date;
        isTrusted: boolean;
    }>;
    currentDeviceFingerprint?: string;
    createdAt: Date;
    updatedAt: Date;
}

export const UserModel = mongoose.model<IUser>('User',UserSchema)