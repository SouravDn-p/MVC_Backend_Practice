"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const auth_routes_1 = require("./modules/auth/auth.routes");
const product_routes_1 = require("./modules/product/product.routes");
const globalErrorHandler_1 = require("./middlewares/globalErrorHandler");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Root route for testing
app.get("/", (req, res) => {
    res.json({
        message: "Welcome to the MVC Backend API",
        status: "success",
        timestamp: new Date().toISOString()
    });
});
// routes
app.use("/api/auth", auth_routes_1.router);
app.use("/api/products", product_routes_1.router);
// global error
app.use(globalErrorHandler_1.globalErrorHandler);
exports.default = app;
