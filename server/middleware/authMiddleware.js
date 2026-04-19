import jwt from "jsonwebtoken";
import env from "../config/env.js";

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 * Attaches decoded user data to req.user
 */
export async function authenticate(req, res, next) {
  try {
    // Extract Authorization header
    const authHeader = req.headers.authorization;

    // Check if header exists
    if (!authHeader) {
      return res.status(401).json({
        error: "Authorization header missing",
      });
    }

    // Check if header follows Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Invalid authorization format",
      });
    }

    // Extract token
    const token = authHeader.substring(7);

    // Verify token
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
      };
      next();
    } catch (jwtError) {
      if (jwtError.name === "TokenExpiredError") {
        return res.status(401).json({
          error: "Token has expired",
        });
      }
      return res.status(401).json({
        error: "Invalid token",
      });
    }
  } catch (error) {
    console.error("[AUTH MIDDLEWARE] Error:", error.message);
    return res.status(500).json({
      error: "An error occurred during authentication",
    });
  }
}

export default authenticate;
