import express from "express";
import * as riskController from "../controllers/riskController.js";
import { authenticate } from "../middleware/authMiddleware.js";

const router = express.Router();

// Protect all risk routes
router.use(authenticate);

router.get("/report", riskController.getRiskReport);

export default router;
