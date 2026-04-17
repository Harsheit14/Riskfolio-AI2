import * as transactionRepository from "../repositories/transactionRepository.js";
import * as assetRepository from "../repositories/assetRepository.js";

/**
 * Create a new transaction (BUY/SELL)
 */
export async function createTransaction(req, res) {
  try {
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || "00000000-0000-0000-0000-000000000001"; // Mock for now

    const { asset, type, quantity, price } = req.body;

    // -------------------------
    // VALIDATION
    // -------------------------
    if (!asset || !type || quantity === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: asset, type, quantity, price",
      });
    }

    if (!["BUY", "SELL"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be BUY or SELL",
      });
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity and price must be greater than 0",
      });
    }

    // -------------------------
    // GET ASSET ID
    // -------------------------
    const assets = await assetRepository.getAssetBySymbol(asset);
    if (!assets) {
      return res.status(404).json({
        success: false,
        message: `Asset ${asset} not found. Please create asset first.`,
      });
    }

    // -------------------------
    // CREATE TRANSACTION
    // -------------------------
    const transaction = await transactionRepository.createTransaction(
      userId,
      assets.id,
      type,
      quantity,
      price
    );

    res.status(201).json({
      success: true,
      data: transaction,
      message: "Transaction created successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create transaction",
    });
  }
}

/**
 * Get all transactions for the user
 */
export async function getTransactions(req, res) {
  try {
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || "00000000-0000-0000-0000-000000000001"; // Mock for now

    const transactions = await transactionRepository.getTransactionsByUser(userId);

    res.status(200).json({
      success: true,
      data: transactions,
      message: "Transactions retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve transactions",
    });
  }
}

/**
 * Get single transaction by ID
 */
export async function getTransactionById(req, res) {
  try {
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || "00000000-0000-0000-0000-000000000001"; // Mock for now
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const transaction = await transactionRepository.getTransactionById(userId, id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
      message: "Transaction retrieved successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve transaction",
    });
  }
}

/**
 * Update transaction
 */
export async function updateTransaction(req, res) {
  try {
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || "00000000-0000-0000-0000-000000000001"; // Mock for now
    const { id } = req.params;
    const { type, quantity, price } = req.body;

    // -------------------------
    // VALIDATION
    // -------------------------
    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    if (!type || quantity === undefined || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: type, quantity, price",
      });
    }

    if (!["BUY", "SELL"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Type must be BUY or SELL",
      });
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity and price must be greater than 0",
      });
    }

    // -------------------------
    // UPDATE TRANSACTION
    // -------------------------
    const transaction = await transactionRepository.updateTransaction(
      userId,
      id,
      type,
      quantity,
      price
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
      message: "Transaction updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to update transaction",
    });
  }
}

/**
 * Delete transaction
 */
export async function deleteTransaction(req, res) {
  try {
    // TODO: Extract userId from JWT token when auth is implemented
    const userId = req.userId || "00000000-0000-0000-0000-000000000001"; // Mock for now
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Transaction ID is required",
      });
    }

    const result = await transactionRepository.deleteTransaction(userId, id);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to delete transaction",
    });
  }
}
