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

      const token = jwt.sign({ id: user._id.toString() }, config.jwtSecret, { expiresIn: "7d" });
      return { user: { id: user._id, name: user.name, email: user.email }, token };
    } catch (err: any) {
      if (err instanceof InvalidCredentialsError) {
        throw err;
      }
      throw new Error(`Login failed: ${err.message || 'Unknown error'}`);
    }
  },
};