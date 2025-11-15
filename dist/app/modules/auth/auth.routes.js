"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.router = void 0;
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("./auth.controller");
exports.router = express_1.default.Router();
exports.router.post("/register", auth_controller_1.authController.register);
exports.router.post("/login", auth_controller_1.authController.login);
exports.router.post("/refresh", auth_controller_1.authController.refresh);
exports.router.post("/logout", auth_controller_1.authController.logout);
