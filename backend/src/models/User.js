import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    phoneNumber: { type: String, trim: true, default: "" },
    avatarUrl: { type: String, trim: true, default: "" },
    role: {
      type: String,
      required: true,
      enum: ["CUSTOMER", "HOTEL_PARTNER", "OPERATIONS_MANAGER", "ADMIN"],
      default: "CUSTOMER",
    },
    status: {
      type: String,
      required: true,
      enum: ["ACTIVE", "SUSPENDED", "BLOCKED"],
      default: "ACTIVE",
    },
    status_reason: { type: String, default: "", alias: "statusReason" },
    isEmailVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
export default User;
