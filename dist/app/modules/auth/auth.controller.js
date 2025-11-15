"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authController = void 0;
const auth_service_1 = require("./auth.service");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
exports.authController = {
    register: async (req, res, next) => {
        try {
            const { name, email, password } = req.body;
            const user = await auth_service_1.authService.register(name, email, password);
            res.status(201).json({
                success: true,
                data: { id: user._id, name: user.name, email: user.email }
            });
        }
        catch (err) {
            if (err.name === "UserAlreadyExistsError") {
                return res.status(409).json({
                    success: false,
                    message: err.message
                });
            }
            next(err);
        }
    },
    login: async (req, res, next) => {
        try {
            const { email, password } = req.body;
            const result = await auth_service_1.authService.login(email, password);
            res.json({ success: true, ...result });
        }
        catch (err) {
            if (err.name === "InvalidCredentialsError") {
                return res.status(401).json({
                    success: false,
                    message: err.message
                });
            }
            next(err);
        }
    },
    refresh: async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            const result = await auth_service_1.authService.refreshAccessToken(refreshToken);
            res.json({ success: true, ...result });
        }
        catch (err) {
            if (err.name === "TokenExpiredError" || err.name === "InvalidTokenError") {
                return res.status(401).json({
                    success: false,
                    message: err.message
                });
            }
            next(err);
        }
    },
    logout: async (req, res, next) => {
        try {
            const { refreshToken } = req.body;
            // Get user ID from the authenticated request (would be set by auth middleware in a real implementation)
            // For now, we'll extract it from the refresh token
            const decoded = jsonwebtoken_1.default.decode(refreshToken);
            if (!decoded || !decoded.id) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid refresh token"
                });
            }
            const result = await auth_service_1.authService.logout(decoded.id, refreshToken);
            res.json({ success: true, ...result });
        }
        catch (err) {
            next(err);
        }
    }
};
