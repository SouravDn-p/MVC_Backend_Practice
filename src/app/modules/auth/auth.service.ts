import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { User } from "./auth.model";
import { config } from "../../configs";

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

class InvalidRefreshTokenError extends Error {
  constructor() {
    super("Invalid refresh token");
    this.name = "InvalidRefreshTokenError";
  }
}

export const authService = {
  async register(name: string, email: string, password: string) {
    try {
      const userExists = await User.findOne({ email });
      if (userExists) throw new UserAlreadyExistsError();
      const user = await User.create({ name, email, password });
      return user;
    } catch (err: any) {
      if (err instanceof UserAlreadyExistsError) {
        throw err;
      }
      throw new Error(`Registration failed: ${err.message || 'Unknown error'}`);
    }
  },

  async login(email: string, password: string) {
    try {
      const user = await User.findOne({ email });
      if (!user) throw new InvalidCredentialsError();
      
      const match = await bcrypt.compare(password, user.password);
      if (!match) throw new InvalidCredentialsError();

      // Generate access token (15 minutes)
      const accessToken = jwt.sign(
        { id: user._id.toString() }, 
        config.jwtSecret, 
        { expiresIn: "15m" }
      );
      
      // Generate refresh token (7 days)
      const refreshToken = jwt.sign(
        { id: user._id.toString() }, 
        config.jwtSecret, 
        { expiresIn: "7d" }
      );
      
      // Store refresh token in user document
      if (!user.refreshTokens) {
        user.refreshTokens = [];
      }
      user.refreshTokens.push(refreshToken);
      await user.save();
      
      return { 
        user: { id: user._id, name: user.name, email: user.email }, 
        accessToken,
        refreshToken
      };
    } catch (err: any) {
      if (err instanceof InvalidCredentialsError) {
        throw err;
      }
      throw new Error(`Login failed: ${err.message || 'Unknown error'}`);
    }
  },
  
  async refreshAccessToken(refreshToken: string) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, config.jwtSecret) as { id: string };
      
      // Find user with this refresh token
      const user = await User.findOne({ 
        _id: decoded.id, 
        refreshTokens: refreshToken 
      });
      
      if (!user) {
        throw new InvalidRefreshTokenError();
      }
      
      // Generate new access token
      const newAccessToken = jwt.sign(
        { id: user._id.toString() }, 
        config.jwtSecret, 
        { expiresIn: "15m" }
      );
      
      return {
        accessToken: newAccessToken
      };
    } catch (err: any) {
      if (err instanceof InvalidRefreshTokenError) {
        throw err;
      }
      throw new InvalidRefreshTokenError();
    }
  },
  
  async logout(userId: string, refreshToken: string) {
    try {
      const user = await User.findById(userId);
      
      if (!user || !user.refreshTokens) {
        return;
      }
      
      // Remove the refresh token from user's refreshTokens array
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      await user.save();
    } catch (err) {
      // Log error but don't throw to avoid breaking the logout flow
      console.error("Logout error:", err);
    }
  }
};