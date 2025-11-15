"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productService = void 0;
const product_model_1 = require("./product.model");
exports.productService = {
    async create(data) {
        return await product_model_1.Product.create(data);
    },
    async getAll() {
        return await product_model_1.Product.find();
    },
};
