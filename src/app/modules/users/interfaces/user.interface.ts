import { Document, Types } from "mongoose";

export type UserRole = "user" | "admin";

export interface IUser extends Document {
  userName: string;
  fullName: string;
  email: string;
  avatar: string;
  watchHistory: Types.ObjectId[];
  role: UserRole;
  password: string;
  refreshToken?: string | null;
  isActive: boolean;
  
  createdAt: Date;
  updatedAt: Date;

  comparePassword(candidatePassword: string): Promise<boolean>;
}