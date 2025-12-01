import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    plan: { type: String, enum: ["free", "pro", "business"], default: "free" },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
