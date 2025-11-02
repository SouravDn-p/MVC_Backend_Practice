import express from "express";
import { productController } from "./product.controller";

export const router = express.Router();

router.post("/", productController.create);
router.get("/", productController.getAll);
