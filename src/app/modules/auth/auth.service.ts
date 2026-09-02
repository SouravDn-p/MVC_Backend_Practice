import type { User } from '@prisma/client';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '../../../config/db/database.config.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../common/utils/jwt.util.ts';
import { generateOtp, hashOtp } from '../../common/utils/otp.util.ts';
import { sendTransactionalEmail } from '../../common/utils/mailer.util.ts';
import { logger } from '../../common/utils/logger.util.ts';
import { ENV } from '../../../config/env.config.ts';
import {
  otpVerificationTemplate,
  passwordResetTemplate,
  welcomeEmailTemplate,
} from '../../../services/templates/email-templates.ts';
import type {
  RegisterDto,
  LoginDto,
  SafeUser,
  AuthTokens,
  VerifyOtpDto,
  ResendOtpDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  DeviceInfo,
  GoogleProfile,
} from './interfaces/auth.interface.ts';

const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const sanitizeUser = (user: User): SafeUser => {
  const { password: _password, ...safeUser } = user;
  return safeUser;
};

const OTP_EXPIRES_MS = ENV.OTP_EXPIRES_MIN * 60 * 1000;
const REFRESH_EXPIRES_MS = ENV.REFRESH_TOKEN_TTL_MS;

const sessionDeviceFields = (device?: DeviceInfo) => ({
  ...(device?.ipAddress ? { ipAddress: device.ipAddress } : {}),
  ...(device?.userAgent ? { userAgent: device.userAgent } : {}),
  ...(device && (device.ipAddress || device.userAgent)
    ? {
        deviceInfo: {
          ...(device.ipAddress ? { ip: device.ipAddress } : {}),
          ...(device.userAgent ? { ua: device.userAgent } : {}),
        },
      }
    : {}),
});

export class AuthService {
  static async register(dto: RegisterDto): Promise<{ user: SafeUser }> {
    const exists = await prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) {
      throw new AppError(MESSAGES.AUTH.EMAIL_EXISTS, HTTP_STATUS.CONFLICT);
    }

    const hashedPassword = await bcryptjs.hash(dto.password, 12);

    const user = await prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
        emailVerified: false,
      },
    });

    await AuthService.issueAndSendOtp(user, 'emailVerification');
    return { user: sanitizeUser(user) };
  }

  private static async issueAndSendOtp(
    user: User,
    tokenType: 'emailVerification' | 'passwordReset',
  ): Promise<void> {
    const otp = generateOtp(6);
    const otpHash = hashOtp(otp);

    await prisma.userToken.deleteMany({
      where: { userId: user.id, tokenType },
    });

    await prisma.userToken.create({
      data: {
        userId: user.id,
        tokenType,
        tokenHash: otpHash,
        expiresAt: new Date(Date.now() + OTP_EXPIRES_MS),
      },
    });

    const subject =
      tokenType === 'emailVerification' ? 'Verify your email' : 'Reset your password';

    const htmlContent =
      tokenType === 'emailVerification'
        ? otpVerificationTemplate(user.name, otp, ENV.OTP_EXPIRES_MIN)
        : passwordResetTemplate(user.name, otp, ENV.OTP_EXPIRES_MIN);

    try {
      await sendTransactionalEmail({
        to: user.email,
        toName: user.name,
        subject,
        htmlContent,
      });
    } catch (error) {
      logger.error('Failed to send OTP email', error);
      if (ENV.IS_PRODUCTION) throw error;
    }
  }

  static async verifyEmailOtp(
    dto: VerifyOtpDto,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    if (user.emailVerified) {
      throw new AppError(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.CONFLICT);
    }

    const storedOtp = await prisma.userToken.findFirst({
      where: {
        userId: user.id,
        tokenType: 'emailVerification',
        tokenHash: hashOtp(dto.otp),
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedOtp) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    const verifiedUser = await prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      });
      await tx.userToken.deleteMany({
        where: { userId: user.id, tokenType: 'emailVerification' },
      });
      return updated;
    });

    try {
      await sendTransactionalEmail({
        to: verifiedUser.email,
        toName: verifiedUser.name,
        subject: 'Welcome',
        htmlContent: welcomeEmailTemplate(verifiedUser.name),
      });
    } catch (error) {
      logger.error('Failed to send welcome email', error);
    }

    const tokens = await AuthService.issueSession(verifiedUser);
    return { user: sanitizeUser(verifiedUser), tokens };
  }

  static async resendOtp(dto: ResendOtpDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) return;

    if (user.emailVerified) {
      throw new AppError(MESSAGES.AUTH.EMAIL_ALREADY_VERIFIED, HTTP_STATUS.CONFLICT);
    }

    const recentOtp = await prisma.userToken.findFirst({
      where: { userId: user.id, tokenType: 'emailVerification' },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      const ageMs = Date.now() - recentOtp.createdAt.getTime();
      const minIntervalMs = 60 * 1000;
      if (ageMs < minIntervalMs) {
        throw new AppError(
          `Please wait ${Math.ceil((minIntervalMs - ageMs) / 1000)}s before requesting another code`,
          HTTP_STATUS.TOO_MANY_REQUESTS,
        );
      }
    }

    await AuthService.issueAndSendOtp(user, 'emailVerification');
  }

  static async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.isActive) return;
    await AuthService.issueAndSendOtp(user, 'passwordReset');
  }

  static async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    const storedOtp = await prisma.userToken.findFirst({
      where: {
        userId: user.id,
        tokenType: 'passwordReset',
        tokenHash: hashOtp(dto.otp),
        expiresAt: { gt: new Date() },
      },
    });

    if (!storedOtp) {
      throw new AppError(MESSAGES.AUTH.OTP_INVALID, HTTP_STATUS.BAD_REQUEST);
    }

    const hashedPassword = await bcryptjs.hash(dto.newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });
      await tx.userToken.deleteMany({
        where: { userId: user.id, tokenType: 'passwordReset' },
      });
      await tx.userToken.deleteMany({
        where: { userId: user.id, tokenType: 'refresh' },
      });
    });
  }

  private static async issueSession(user: User, device?: DeviceInfo): Promise<AuthTokens> {
    await prisma.userToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    const tokens = {
      accessToken: generateAccessToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
      refreshToken: generateRefreshToken({
        userId: user.id,
        email: user.email,
        role: user.role,
      }),
    };

    await prisma.userToken.create({
      data: {
        userId: user.id,
        tokenType: 'refresh',
        tokenHash: hashToken(tokens.refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
        ...sessionDeviceFields(device),
      },
    });

    return tokens;
  }

  static async login(
    dto: LoginDto,
    device?: DeviceInfo,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const user = await prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_DEACTIVATED, HTTP_STATUS.FORBIDDEN);
    }

    const isMatch = await bcryptjs.compare(dto.password, user.password);
    if (!isMatch) {
      throw new AppError(MESSAGES.AUTH.INVALID_CREDENTIALS, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!user.emailVerified) {
      await AuthService.issueAndSendOtp(user, 'emailVerification');
      throw new AppError(MESSAGES.AUTH.EMAIL_NOT_VERIFIED, HTTP_STATUS.FORBIDDEN);
    }

    const tokens = await AuthService.issueSession(user, device);
    return { user: sanitizeUser(user), tokens };
  }

  static async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await prisma.userToken.deleteMany({
        where: {
          userId,
          tokenType: 'refresh',
          tokenHash: hashToken(refreshToken),
        },
      });
    }
  }

  static async logoutAll(userId: string): Promise<void> {
    await prisma.userToken.deleteMany({
      where: { userId, tokenType: 'refresh' },
    });
  }

  static async refreshToken(
    token: string,
    device?: DeviceInfo,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    if (!token) {
      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    const tokenHash = hashToken(token);
    const storedToken = await prisma.userToken.findFirst({
      where: {
        tokenHash,
        tokenType: 'refresh',
        userId: decoded.userId,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!storedToken) {
      const anyValidSession = await prisma.userToken.findFirst({
        where: {
          userId: decoded.userId,
          tokenType: 'refresh',
          expiresAt: { gt: new Date() },
        },
      });

      if (anyValidSession) {
        await prisma.userToken.deleteMany({
          where: { userId: decoded.userId, tokenType: 'refresh' },
        });
      }

      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    if (!storedToken.user.isActive) {
      throw new AppError(MESSAGES.AUTH.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
    }

    const tokens = {
      accessToken: generateAccessToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      }),
      refreshToken: generateRefreshToken({
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
      }),
    };

    const ipAddress = device?.ipAddress ?? storedToken.ipAddress ?? undefined;
    const userAgent = device?.userAgent ?? storedToken.userAgent ?? undefined;

    await prisma.$transaction([
      prisma.userToken.delete({ where: { id: storedToken.id } }),
      prisma.userToken.create({
        data: {
          userId: storedToken.user.id,
          tokenType: 'refresh',
          tokenHash: hashToken(tokens.refreshToken),
          expiresAt: new Date(Date.now() + REFRESH_EXPIRES_MS),
          ...(ipAddress ? { ipAddress } : {}),
          ...(userAgent ? { userAgent } : {}),
          ...(storedToken.deviceInfo != null ? { deviceInfo: storedToken.deviceInfo } : {}),
          lastUsedAt: new Date(),
        },
      }),
    ]);

    return { user: sanitizeUser(storedToken.user), tokens };
  }

  static async getUserProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    return sanitizeUser(user);
  }

  static async getActiveSessions(userId: string) {
    return prisma.userToken.findMany({
      where: { userId, tokenType: 'refresh', expiresAt: { gt: new Date() } },
      select: {
        id: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  static async revokeSession(userId: string, sessionId: string): Promise<void> {
    await prisma.userToken.deleteMany({
      where: { id: sessionId, userId, tokenType: 'refresh' },
    });
  }

  static async googleLogin(
    profile: GoogleProfile,
    device?: DeviceInfo,
  ): Promise<{ user: SafeUser; tokens: AuthTokens }> {
    const { googleId, name, email, avatar } = profile;

    let user = await prisma.user.findFirst({
      where: { provider: 'google', providerId: googleId },
    });

    if (!user) {
      const existingEmailUser = await prisma.user.findUnique({ where: { email } });

      if (existingEmailUser) {
        if (existingEmailUser.provider === 'local') {
          throw new AppError(
            'This email is registered with a password. Please log in using email and password.',
            HTTP_STATUS.CONFLICT,
          );
        }
        throw new AppError(
          'This email is already registered with a different provider.',
          HTTP_STATUS.CONFLICT,
        );
      }

      const hashedPassword = await bcryptjs.hash(crypto.randomBytes(16).toString('hex'), 12);

      user = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          provider: 'google',
          providerId: googleId,
          photo: avatar,
          emailVerified: true,
        },
      });

      try {
        await sendTransactionalEmail({
          to: user.email,
          toName: user.name,
          subject: 'Welcome',
          htmlContent: welcomeEmailTemplate(user.name),
        });
      } catch (error) {
        logger.error('Failed to send welcome email', error);
      }
    }

    if (!user.isActive) {
      throw new AppError(MESSAGES.AUTH.ACCOUNT_DEACTIVATED, HTTP_STATUS.FORBIDDEN);
    }

    const tokens = await AuthService.issueSession(user, device);
    return { user: sanitizeUser(user), tokens };
  }
}
