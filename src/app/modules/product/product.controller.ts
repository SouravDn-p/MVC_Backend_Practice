import { Request, Response, NextFunction } from "express";
import { productService } from "./product.service";

export const productController = {
  create: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const product = await productService.create(req.body);
      res.status(201).json({ success: true, data: product });
    } catch (err) {
      next(err);
    }
  },

  getAll: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const products = await productService.getAll();
      res.json({ success: true, data: products });
    } catch (err) {
      next(err);
    }
  },
};
