import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";
import jwt from "jsonwebtoken";

export const authController = {
  register: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { name, email, password } = req.body;
      const user = await authService.register(name, email, password);
      res.status(201).json({ 
        success: true, 
        data: { id: user._id, name: user.name, email: user.email } 
      });
    } catch (err: any) {
      if (err.name === "UserAlreadyExistsError") {
        return res.status(409).json({ 
          success: false, 
          message: err.message 
        });
      }
      next(err);
    }
  },

  login: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, password } = req.body;
      const result = await authService.login(email, password);
      res.json({ success: true, ...result });
    } catch (err: any) {
      if (err.name === "InvalidCredentialsError") {
        return res.status(401).json({ 
          success: false, 
          message: err.message 
        });
      }
      next(err);
    }
  },
  
  refresh: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { refreshToken } = req.body;
      
      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Refresh token is required"
        });
      }
      
      const result = await authService.refreshAccessToken(refreshToken);
      res.json({ success: true, ...result });
    } catch (err: any) {
      if (err.name === "InvalidRefreshTokenError") {
        return res.status(401).json({
          success: false,
          message: err.message
        });
      }
      next(err);
    }
  },
  
  logout: async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      const refreshToken = req.body.refreshToken;
      
      if (!authHeader || !authHeader.startsWith("Bearer ") || !refreshToken) {
        return res.status(400).json({
          success: false,
          message: "Access token and refresh token are required"
        });
      }
      
      const token = authHeader.split(" ")[1];
      const decoded: any = jwt.decode(token);
      
      if (decoded && decoded.id) {
        await authService.logout(decoded.id, refreshToken);
      }
      
      res.json({ success: true, message: "Logged out successfully" });
    } catch (err) {
      next(err);
    }
  }
};