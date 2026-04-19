import express from "express";
import * as transactionController from "../controllers/transactionController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { validate, createTransactionSchema, updateTransactionSchema } from "../middleware/validationMiddleware.js";

const router = express.Router();

// Protect all transaction routes
router.use(authenticate);

// Create transaction (BUY/SELL)
router.post("/", validate(createTransactionSchema), transactionController.createTransaction);

// Get all transactions for user
router.get("/", transactionController.getTransactions);

// Get single transaction by ID
router.get("/:id", transactionController.getTransactionById);

// Update transaction
router.put("/:id", validate(updateTransactionSchema), transactionController.updateTransaction);

// Delete transaction
router.delete("/:id", transactionController.deleteTransaction);

export default router;
