import express from "express";
import passport from "passport";
import { authController } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", (req, res) => authController.signup(req, res));
router.post("/login", (req, res) => authController.login(req, res));
router.get("/session", (req, res) => authController.session(req, res));

// Google OAuth routes
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
    "/google/callback",
    (req, res, next) => {
        passport.authenticate("google", { session: false }, (err, user, info) => {
            if (err) {
                console.error("Google OAuth error:", err);
                return res.redirect("/html/index.html?error=google_auth_failed");
            }

            if (!user) {
                return res.redirect("/html/index.html?error=account_not_found");
            }

            // Attach user to request
            req.user = user;
            authController.googleCallback(req, res);
        })(req, res, next);
    }
);

export default router;
