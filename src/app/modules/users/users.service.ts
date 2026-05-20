import { User } from './schemas/users.schema.ts';
import type { IUser } from './interfaces/user.interface.ts';
import type { SafeUser } from '../auth/interfaces/auth.interface.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';

const sanitizeUser = (user: IUser): SafeUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export class UsersService {
  async getUserProfile(userId: string): Promise<SafeUser> {
    const user = await User.findById(userId);
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  async updateUserProfile(userId: string, data: Partial<IUser>): Promise<SafeUser> {
    // Only allow updating name and email on self-profile
    const updateData: Record<string, any> = {};
    if (data.name) updateData.name = data.name;
    if (data.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: userId } });
      if (existing) {
        throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
      }
      updateData.email = data.email;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true, runValidators: true });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  async getAllUsers(): Promise<SafeUser[]> {
    const users = await User.find();
    return users.map(sanitizeUser);
  }

  async getUserById(id: string): Promise<SafeUser> {
    const user = await User.findById(id);
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  async updateUser(id: string, data: Partial<IUser>): Promise<SafeUser> {
    if (data.email) {
      const existing = await User.findOne({ email: data.email, _id: { $ne: id } });
      if (existing) {
        throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
      }
    }

    const user = await User.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  async deleteUser(id: string): Promise<void> {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
  }
}
