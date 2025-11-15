"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productController = void 0;
const product_service_1 = require("./product.service");
exports.productController = {
    create: async (req, res, next) => {
        try {
            const product = await product_service_1.productService.create(req.body);
            res.status(201).json({ success: true, data: product });
        }
        catch (err) {
            next(err);
        }
    },
    getAll: async (req, res, next) => {
        try {
            const products = await product_service_1.productService.getAll();
            res.json({ success: true, data: products });
        }
        catch (err) {
            next(err);
        }
    },
};
