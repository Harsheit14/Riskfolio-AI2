import express from "express";
import * as riskController from "../controllers/riskController.js";

const router = express.Router();

router.get("/report", riskController.getRiskReport);

export default router;
