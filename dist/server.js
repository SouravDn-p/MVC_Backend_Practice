"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app/app"));
const configs_1 = require("./app/configs");
mongoose_1.default.connect(configs_1.config.mongoUri, {
    serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
})
    .then(() => {
    console.log("✅ MongoDB connected successfully");
    app_1.default.listen(configs_1.config.port, () => {
        console.log(`🚀 Server running on port ${configs_1.config.port}`);
    });
})
    .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
});
// Handle MongoDB connection events
mongoose_1.default.connection.on('error', err => {
    console.error('MongoDB connection error:', err);
});
mongoose_1.default.connection.on('disconnected', () => {
    console.log('MongoDB disconnected');
});
// Graceful shutdown
process.on('SIGINT', async () => {
    await mongoose_1.default.connection.close();
    console.log('MongoDB connection closed through app termination');
    process.exit(0);
});
