import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { User } from "../models/User.js";

export function configurePassport() {
    // Serialize user for session
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    // Deserialize user from session
    passport.deserializeUser(async (id, done) => {
        try {
            const user = await User.findById(id);
            done(null, user);
        } catch (err) {
            done(err, null);
        }
    });

    // Google OAuth Strategy

    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || "http://localhost:8080/api/auth/google/callback",
            },
            async (accessToken, refreshToken, profile, done) => {
                try {
                    const email = profile.emails?.[0]?.value;

                    if (!email) {
                        return done(new Error("No email found in Google profile"), null);
                    }

                    // Find user by email (must exist - no signup via Google)
                    let user = await User.findOne({ email: email.toLowerCase() });

                    if (!user) {
                        // User doesn't exist - return error
                        return done(null, false, {
                            message: "account_not_found",
                            email: email
                        });
                    }

                    // User exists - link Google ID if not already linked
                    if (!user.googleId) {
                        user.googleId = profile.id;
                        user.authProvider = user.password ? "both" : "google";
                        await user.save();
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err, null);
                }
            }
        )
    );
}
