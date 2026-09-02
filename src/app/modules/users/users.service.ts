import { prisma } from '../../../config/db/database.config.ts';
import { HTTP_STATUS } from '../../common/constants/http-status.constants.ts';
import { MESSAGES } from '../../common/constants/messages.constants.ts';
import { AppError } from '../../common/exceptions/app-error.exception.ts';
import { deleteImage, uploadImageBuffer } from '../../common/utils/cloudinary.util.ts';
import type { UpdateUserDto } from './interfaces/users.interface.ts';
import { Prisma, UserRole } from '@prisma/client';

export class UsersService {
  static async getUserProfile(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }
    const { password: _password, ...safeUser } = user;
    return safeUser;
  }

  static async updateUserProfile(
    userId: string,
    dto: UpdateUserDto,
    photoFile?: Express.Multer.File,
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    const hasFile = Boolean(photoFile);
    const hasFields =
      dto.name !== undefined || dto.photo !== undefined || dto.location !== undefined;

    if (!hasFile && !hasFields) {
      throw new AppError(MESSAGES.USER.NOTHING_TO_UPDATE, HTTP_STATUS.BAD_REQUEST);
    }

    let photo = dto.photo !== undefined ? dto.photo || null : undefined;
    let imagePublicId: string | null | undefined;

    if (photoFile) {
      const uploaded = await uploadImageBuffer(photoFile.buffer);
      if (user.imagePublicId) {
        await deleteImage(user.imagePublicId);
      }
      photo = uploaded.url;
      imagePublicId = uploaded.publicId;
    } else if (dto.photo === null || dto.photo === '') {
      if (user.imagePublicId) {
        await deleteImage(user.imagePublicId);
      }
      photo = null;
      imagePublicId = null;
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(photo !== undefined ? { photo } : {}),
        ...(imagePublicId !== undefined ? { imagePublicId } : {}),
        ...(dto.location !== undefined ? { location: dto.location || null } : {}),
      },
    });

    const { password: _password, ...safeUser } = updatedUser;
    return safeUser;
  }

  static async adminGetAllUsers(
    limit = 20,
    page = 1,
    search?: string,
    role?: UserRole,
  ) {
    const skip = (page - 1) * limit;
    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          photo: true,
          location: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  static async adminUpdateUserStatus(
    adminId: string,
    targetUserId: string,
    isActive: boolean,
  ) {
    if (adminId === targetUserId) {
      throw new AppError('You cannot update your own active status', HTTP_STATUS.BAD_REQUEST);
    }

    const user = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!user) {
      throw new AppError(MESSAGES.USER.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    }

    if (user.role === 'ADMIN') {
      throw new AppError(
        'Cannot change active status of an admin account',
        HTTP_STATUS.FORBIDDEN,
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!isActive) {
      await prisma.userToken.deleteMany({
        where: { userId: targetUserId, tokenType: 'refresh' },
      });
    }

    return updatedUser;
  }
}
