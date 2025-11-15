import express from "express";
import { authController } from "./auth.controller";
import { authGuard } from "../../middlewares/authGuard";

export const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authGuard, authController.logout);
