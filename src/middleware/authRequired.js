import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/security.js";

const JWT_SECRET = getJwtSecret();

export function authRequired(req, res, next) {
  try {
    const header = req.headers?.authorization || req.headers?.Authorization;
    const bearerToken = typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    const token = bearerToken || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    req.user = { _id: payload._id, email: payload.email, plan: payload.plan };
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}
