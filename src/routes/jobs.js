import express from "express";
import { jobController } from "../controllers/jobController.js";


const router = express.Router();

// Protected routes
router.post("/", (req, res) => jobController.createJob(req, res));
router.get("/:id/status", (req, res) => jobController.getStatus(req, res));
router.get("/:id/download", (req, res) => jobController.download(req, res));
router.delete("/:id/temp", (req, res) => jobController.deleteTemp(req, res));

export default router;
