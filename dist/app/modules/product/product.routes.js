"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const product_controller_1 = require("./product.controller");
const authGuard_1 = require("../../middlewares/authGuard");
exports.router = express_1.default.Router();
exports.router.post("/", authGuard_1.authGuard, product_controller_1.productController.create);
exports.router.get("/", authGuard_1.authGuard, product_controller_1.productController.getAll);
