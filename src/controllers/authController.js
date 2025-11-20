import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

function signToken(user) {
  const secret = process.env.JWT_SECRET || "dev_secret_change_me";
  const payload = { _id: user._id.toString(), email: user.email, plan: user.plan };
  return jwt.sign(payload, secret, { expiresIn: "7d" });
}

export const authController = {
  async signup(req, res) {
    try {
      const { username, email, password } = req.body || {};
      if (!username || !email || !password) {
        return res.status(400).json({ error: "missing_fields" });
      }

      const existing = await User.findOne({ email: email.toLowerCase() });
      if (existing) {
        return res.status(409).json({ error: "email_in_use" });
      }

      const hash = await bcrypt.hash(password, 10);
      const user = await User.create({ username, email: email.toLowerCase(), password: hash, plan: "free" });

      const token = signToken(user);
      if (process.env.COOKIE_SESSION === "true") {
        res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 });
      }

      const safe = { _id: user._id, username: user.username, email: user.email, plan: user.plan };
      return res.status(201).json({ token, user: safe });
    } catch (err) {
      return res.status(500).json({ error: "signup_failed", message: err.message });
    }
  },

  async login(req, res) {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: "missing_fields" });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(401).json({ error: "invalid_credentials" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: "invalid_credentials" });

      const token = signToken(user);
      if (process.env.COOKIE_SESSION === "true") {
        res.cookie("token", token, { httpOnly: true, secure: false, sameSite: "lax", maxAge: 7 * 24 * 3600 * 1000 });
      }

      const safe = { _id: user._id, username: user.username, email: user.email, plan: user.plan };
      return res.json({ token, user: safe });
    } catch (err) {
      return res.status(500).json({ error: "login_failed", message: err.message });
    }
  },
};
