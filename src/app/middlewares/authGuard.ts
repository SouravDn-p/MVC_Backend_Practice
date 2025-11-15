import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../configs";

interface JwtPayload {
  id: string;
}

export const authGuard = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }

    const token = authHeader.split(" ")[1];
    
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    (req as any).user = decoded;
    
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token."
    });
  }
};