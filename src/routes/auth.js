import express from "express";
import { authController } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", (req, res) => authController.signup(req, res));
router.post("/login", (req, res) => authController.login(req, res));

export default router;
