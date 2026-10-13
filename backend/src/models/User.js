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
            required: true,
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
            default: '',
        },
        role: {
            type: String,
            enum: ['CUSTOMER', 'HOTEL_PARTNER', 'OPERATIONS_MANAGER', 'ADMIN', 'PARTNER', 'STAFF'],
            default: 'CUSTOMER',
        },
        status: {
            type: String,
            enum: ['ACTIVE', 'SUSPENDED', 'DEACTIVATED', 'BLOCKED'],
            default: 'ACTIVE',
        },
        isEmailVerified: {
            type: Boolean,
            default: false,
        },
    },
    {
        timestamps: true,
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