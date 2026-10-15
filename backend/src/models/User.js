import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
        }, 
        fullName: {
            type: String,
            required: true,
            trim: true,
        },
        phoneNumber: {
            type: String,
            trim: true,
        },
        avatarUrl: {
            type: String,
            trim: true,
        },
        role: {
            type: String,
            enum: ['CUSTOMER', 'PARTNER', 'STAFF', 'ADMIN'],
            default: 'CUSTOMER',
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'SUSPENDED', 'BLOCKED'],
            default: 'ACTIVE',
        },
        isEmailVerified: {
            type: Boolean,
            required: false,
        },
        createdAt: {
            type: Date,
        },
        updatedAt: {
            type: Date
        },
        status_reason: {
            type: String,
            trim: true,
        },
    },
    {
        timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
    }
);

// Mã hóa mật khẩu
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    this.password = await bcrypt.hash(this.password, 10);
});

// So khớp mật khẩu
userSchema.methods.comparePassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};
const User = mongoose.model('User', userSchema);

export default User;
