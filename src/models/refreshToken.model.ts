import mongoose, { Document, Schema } from "mongoose";

const RefreshTokenSchema: Schema = new Schema({
    token: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deviceInfo: {
        userAgent: { type: String, required: true },
        ip: { type: String, required: true },
        deviceFingerprint: { type: String, required: true }
    },
    expiresAt: { type: Date, required: true },
    isRevoked: { type: Boolean, default: false },
    revokedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Index for faster lookups
RefreshTokenSchema.index({ token: 1 });
RefreshTokenSchema.index({ userId: 1 });
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

export interface IRefreshToken extends Document {
    token: string;
    userId: mongoose.Types.ObjectId;
    deviceInfo: {
        userAgent: string;
        ip: string;
        deviceFingerprint: string;
    };
    expiresAt: Date;
    isRevoked: boolean;
    revokedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export const RefreshTokenModel = mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
