import express from "express";
import * as transactionController from "../controllers/transactionController.js";
import { pool } from "../config/db.js";

console.log("POOL CONFIG CHECK:", pool.options);
const router = express.Router();

router.use((req, res, next) => {
  console.log("TRANSACTION ROUTE HIT, userId:", req.userId);
  next();
});

// Create transaction (BUY/SELL)
router.post("/", transactionController.createTransaction);

// Get all transactions for user
router.get("/", transactionController.getTransactions);

// Get single transaction by ID
router.get("/:id", transactionController.getTransactionById);

// Update transaction
router.put("/:id", transactionController.updateTransaction);

// Delete transaction
router.delete("/:id", transactionController.deleteTransaction);

export default router;
