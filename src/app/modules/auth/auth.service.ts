import { HTTP_STATUS } from "../../common/constants/http-status.constants.ts";
import { MESSAGES } from "../../common/constants/messages.constants.ts";
import { AppError } from "../../common/exceptions/app-error.exception.ts";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../../common/utils/jwt.util.ts";
import type { IUser } from "../users/interfaces/user.interface.ts";
import { User } from "../users/schemas/users.schema.ts";
import type { AuthTokens, RegisterDto, LoginDto, SafeUser } from "./interfaces/auth.interface.ts";

const sanitizeUser = (user: IUser): SafeUser => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

const buildTokens = (user: IUser): AuthTokens => {
  const payload = { userId: user._id.toString(), email: user.email, role: user.role };
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

export class AuthService {
  async register(dto: RegisterDto): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const existing = await User.findOne({ email: dto.email });
    if (existing) {
      throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const user = await User.create(dto);
    const tokens = buildTokens(user);

    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return { user: sanitizeUser(user), tokens };
  }

  async login(dto: LoginDto): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    // Need to explicitly select password since select is false in schema
    const user = await User.findOne({ email: dto.email }).select('+password');
    if (!user) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError('Your account has been deactivated', HTTP_STATUS.FORBIDDEN);
    }

    const isMatch = await user.comparePassword(dto.password);
    if (!isMatch) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    const tokens = buildTokens(user);
    user.refreshToken = tokens.refreshToken;
    await user.save({ validateBeforeSave: false });

    return { user: sanitizeUser(user), tokens };
  }

  async logout(userId: string): Promise<void> {
    await User.findByIdAndUpdate(userId, { $unset: { refreshToken: 1 } });
  }

  async refreshTokens(token: string): Promise<AuthTokens> {
    try {
      const decoded = verifyRefreshToken(token);
      
      const user = await User.findById(decoded.userId).select('+refreshToken');
      if (!user || user.refreshToken !== token) {
        throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
      }

      if (!user.isActive) {
        throw new AppError('Your account has been deactivated', HTTP_STATUS.FORBIDDEN);
      }

      const tokens = buildTokens(user);
      user.refreshToken = tokens.refreshToken;
      await user.save({ validateBeforeSave: false });

      return tokens;
    } catch (error) {
      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }
  }
}