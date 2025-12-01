import express from "express";
import { jobController } from "../controllers/jobController.js";
import { authRequired } from "../middleware/authRequired.js";

const router = express.Router();

// Protected routes
router.post("/", authRequired, (req, res) => jobController.createJob(req, res));
router.get("/:id/status", authRequired, (req, res) => jobController.getStatus(req, res));
router.get("/:id/download", authRequired, (req, res) => jobController.download(req, res));
router.delete("/:id/temp", authRequired, (req, res) => jobController.deleteTemp(req, res));

export default router;
