import express from "express";
import * as portfolioController from "../controllers/portfolioController.js";
console.log("Portfolio routes loaded");
const router = express.Router();

router.get("/holdings", portfolioController.getHoldings);
router.get("/value", portfolioController.getPortfolioValue);
router.get("/performance", portfolioController.getPerformance);

export default router;
