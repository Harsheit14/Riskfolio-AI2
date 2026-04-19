import express from "express";
import * as authController from "../controllers/authController.js";
import { validate, authRegisterSchema, authLoginSchema } from "../middleware/validationMiddleware.js";

const router = express.Router();

router.post("/register", validate(authRegisterSchema), authController.register);
router.post("/login", validate(authLoginSchema), authController.login);

export default router;
