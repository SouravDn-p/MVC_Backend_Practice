import mongoose from "mongoose";
import app from "./app/app";
import { config } from "./app/configs";


mongoose.connect(config.mongoUri, {
  serverSelectionTimeoutMS: 10000, // Increased to 10 seconds
})
  .then(() => {
    console.log("✅ MongoDB connected successfully");
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err);
    process.exit(1);
  });

// Handle MongoDB connection events
mongoose.connection.on('error', err => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('MongoDB connection closed through app termination');
  process.exit(0);
});