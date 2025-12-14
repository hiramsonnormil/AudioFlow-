import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import validator from "validator";
import { User } from "../models/User.js";
import { buildCookieOptions, getJwtSecret } from "../config/security.js";

const JWT_SECRET = getJwtSecret();
const COOKIE_SESSION_ENABLED = process.env.COOKIE_SESSION === "true";
const MIN_PASSWORD_LENGTH = Number(process.env.PASSWORD_MIN_LENGTH) || 8;

const safeUser = (user) => ({
  _id: user._id,
  username: user.username,
  email: user.email,
  plan: user.plan,
});

const signToken = (user) => {
  const payload = { _id: user._id.toString(), email: user.email, plan: user.plan };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

const setAuthCookie = (res, token, { force } = {}) => {
  if (!COOKIE_SESSION_ENABLED && !force) {
    return;
  }
  res.cookie("token", token, buildCookieOptions());
};

const normalizeEmail = (value) =>
  validator.normalizeEmail(value || "", {
    gmail_remove_dots: false,
    gmail_remove_subaddress: false,
  });

const isPasswordValid = (password) => {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    return false;
  }
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  return hasLetter && hasNumber;
};

export const authController = {
  async signup(req, res) {
    try {
      console.log("[SIGNUP] Recebido:", { username: req.body?.username, email: req.body?.email });
      
      const rawUsername = typeof req.body?.username === "string" ? req.body.username.trim() : "";
      const sanitizedUsername = validator
        .whitelist(rawUsername, "a-zA-Z0-9 _.-")
        .replace(/\s+/g, " ")
        .trim();

      console.log("[SIGNUP] Username sanitizado:", sanitizedUsername);

      const normalizedEmail = normalizeEmail(req.body?.email);
      const password = req.body?.password;

      console.log("[SIGNUP] Email normalizado:", normalizedEmail);

      if (!sanitizedUsername || !normalizedEmail || !password) {
        return res.status(400).json({ error: "missing_fields" });
      }

      if (!validator.isLength(sanitizedUsername, { min: 3, max: 40 })) {
        console.log("[SIGNUP] Username inválido (comprimento)");
        return res.status(400).json({ error: "invalid_username" });
      }

      if (!validator.isEmail(normalizedEmail)) {
        console.log("[SIGNUP] Email inválido");
        return res.status(400).json({ error: "invalid_email" });
      }

      if (!isPasswordValid(password)) {
        console.log("[SIGNUP] Senha fraca");
        return res.status(400).json({ error: "weak_password" });
      }

      console.log("[SIGNUP] Verificando usuário existente...");
      const existing = await User.findOne({ email: normalizedEmail });
      if (existing) {
        console.log("[SIGNUP] Email já em uso");
        return res.status(409).json({ error: "email_in_use" });
      }

      console.log("[SIGNUP] Criando hash da senha...");
      const hash = await bcrypt.hash(password, 12);
      
      console.log("[SIGNUP] Criando usuário no banco...");
      const user = await User.create({
        username: sanitizedUsername,
        email: normalizedEmail,
        password: hash,
        plan: "free",
      });

      const token = signToken(user);
      setAuthCookie(res, token);

      return res.status(201).json({ token, user: safeUser(user) });
    } catch (err) {
      console.error("[SIGNUP] ERRO:", err);
      return res.status(500).json({ error: "signup_failed", message: err.message });
    }
  },

  async login(req, res) {
    try {
      const normalizedEmail = normalizeEmail(req.body?.email);
      const password = req.body?.password;

      if (!normalizedEmail || !password) {
        return res.status(400).json({ error: "missing_fields" });
      }

      if (!validator.isEmail(normalizedEmail)) {
        return res.status(400).json({ error: "invalid_email" });
      }

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) return res.status(401).json({ error: "invalid_credentials" });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok) return res.status(401).json({ error: "invalid_credentials" });

      const token = signToken(user);
      setAuthCookie(res, token);

      return res.json({ token, user: safeUser(user) });
    } catch (err) {
      return res.status(500).json({ error: "login_failed", message: err.message });
    }
  },

  async googleCallback(req, res) {
    try {
      const user = req.user;

      if (!user) {
        return res.redirect("/html/index.html?error=account_not_found");
      }

      const token = signToken(user);

      // OAuth flow requires a cookie for the session restore endpoint
      setAuthCookie(res, token, { force: true });

      // Redirect to home with flag so frontend can restore session
      return res.redirect("/html/index.html?oauth=google");
    } catch (err) {
      console.error("Google callback error:", err);
      return res.redirect("/html/index.html?error=google_auth_failed");
    }
  },

  async session(req, res) {
    try {
      const header = req.headers?.authorization || req.headers?.Authorization;
      const bearer = typeof header === "string" && header.startsWith("Bearer ") ? header.slice(7) : null;
      const token = req.cookies?.token || bearer;

      if (!token) {
        return res.status(401).json({ error: "no_session" });
      }

      const payload = jwt.verify(token, JWT_SECRET);

      const user = await User.findById(payload._id).select("_id username email plan");

      if (!user) {
        res.clearCookie("token", buildCookieOptions({ maxAge: 0 }));
        return res.status(404).json({ error: "account_not_found" });
      }

      return res.json({ token, user: safeUser(user) });
    } catch (err) {
      console.error("Session restore error:", err.message);
      res.clearCookie("token", buildCookieOptions({ maxAge: 0 }));
      return res.status(401).json({ error: "invalid_session" });
    }
  }
};
