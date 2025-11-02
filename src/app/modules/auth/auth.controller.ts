import { Request, Response, NextFunction } from "express";
import { authService } from "./auth.service";

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
};