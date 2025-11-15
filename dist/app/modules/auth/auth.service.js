"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const auth_model_1 = require("./auth.model");
const configs_1 = require("../../configs");
// Custom error classes for better error handling
class UserAlreadyExistsError extends Error {
    constructor() {
        super("User already exists");
        this.name = "UserAlreadyExistsError";
    }
}
class InvalidCredentialsError extends Error {
    constructor() {
        super("Invalid credentials");
        this.name = "InvalidCredentialsError";
    }
}
class TokenExpiredError extends Error {
    constructor() {
        super("Token expired");
        this.name = "TokenExpiredError";
    }
}
class InvalidTokenError extends Error {
    constructor() {
        super("Invalid token");
        this.name = "InvalidTokenError";
    }
}
exports.authService = {
    async register(name, email, password) {
        try {
            const userExists = await auth_model_1.User.findOne({ email });
            if (userExists)
                throw new UserAlreadyExistsError();
            const user = await auth_model_1.User.create({ name, email, password, refreshTokens: [] });
            return user;
        }
        catch (err) {
            if (err instanceof UserAlreadyExistsError) {
                throw err;
            }
            throw new Error(`Registration failed: ${err.message || 'Unknown error'}`);
        }
    },
    async login(email, password) {
        try {
            const user = await auth_model_1.User.findOne({ email });
            if (!user)
                throw new InvalidCredentialsError();
            const match = await bcrypt_1.default.compare(password, user.password);
            if (!match)
                throw new InvalidCredentialsError();
            // Generate access and refresh tokens
            const accessToken = jsonwebtoken_1.default.sign({ id: user._id.toString(), email: user.email }, configs_1.config.jwtSecret, { expiresIn: "15m" } // Short-lived access token
            );
            const refreshToken = jsonwebtoken_1.default.sign({ id: user._id.toString(), email: user.email }, configs_1.config.jwtSecret, { expiresIn: "7d" } // Longer-lived refresh token
            );
            // Save refresh token to user document
            user.refreshTokens.push(refreshToken);
            await user.save();
            return {
                user: { id: user._id, name: user.name, email: user.email },
                accessToken,
                refreshToken
            };
        }
        catch (err) {
            if (err instanceof InvalidCredentialsError) {
                throw err;
            }
            throw new Error(`Login failed: ${err.message || 'Unknown error'}`);
        }
    },
    async refreshAccessToken(refreshToken) {
        try {
            // Verify refresh token
            const decoded = jsonwebtoken_1.default.verify(refreshToken, configs_1.config.jwtSecret);
            // Find user with this refresh token
            const user = await auth_model_1.User.findOne({
                _id: decoded.id,
                refreshTokens: refreshToken
            });
            if (!user)
                throw new InvalidTokenError();
            // Generate new access token
            const newAccessToken = jsonwebtoken_1.default.sign({ id: user._id.toString(), email: user.email }, configs_1.config.jwtSecret, { expiresIn: "15m" });
            return { accessToken: newAccessToken };
        }
        catch (err) {
            if (err instanceof jsonwebtoken_1.default.TokenExpiredError) {
                throw new TokenExpiredError();
            }
            if (err instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                throw new InvalidTokenError();
            }
            throw new Error(`Token refresh failed: ${err.message || 'Unknown error'}`);
        }
    },
    async logout(userId, refreshToken) {
        try {
            const user = await auth_model_1.User.findById(userId);
            if (!user)
                throw new Error("User not found");
            // Remove refresh token from user's refreshTokens array
            user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
            await user.save();
            return { message: "Logged out successfully" };
        }
        catch (err) {
            throw new Error(`Logout failed: ${err.message || 'Unknown error'}`);
        }
    }
};
