import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, trim: true, minlength: 2, maxlength: 50 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: false }, // Optional for Google OAuth users
    googleId: { type: String, sparse: true, unique: true }, // Google OAuth ID
    authProvider: { type: String, enum: ["local", "google", "both"], default: "local" },
    plan: {
      type: String,
      enum: ["free", "voz_pro", "voz_master"],
      default: "free",
    },
    usageHistory: {
      type: [{ timestamp: Date }],
      default: [],
    },
  },
  { timestamps: true }
);

export const User = mongoose.model("User", UserSchema);
