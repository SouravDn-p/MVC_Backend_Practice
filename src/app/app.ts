import express from "express";
import cors from "cors";
import { router as authRouter } from "./modules/auth/auth.routes";
import { router as productRouter } from "./modules/product/product.routes";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";

const app = express();
app.use(cors());
app.use(express.json());

// Root route for testing
app.get("/", (req, res) => {
  res.json({ 
    message: "Welcome to the MVC Backend API", 
    status: "success",
    timestamp: new Date().toISOString()
  });
});

// routes
app.use("/api/auth", authRouter);
app.use("/api/products", productRouter);

// global error
app.use(globalErrorHandler);

export default app;