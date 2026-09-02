import { isCloudinaryConfigured } from '../../../config/env.config.ts';
import { cloudinary } from '../../../config/cloudinary/cloudinary.config.ts';
import { AppError } from '../exceptions/app-error.exception.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

export const uploadImageBuffer = async (
  buffer: Buffer,
  folder = 'avatars',
): Promise<CloudinaryUploadResult> => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      HTTP_STATUS.BAD_REQUEST,
    );
  }

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `mvc-api/${folder}`,
        resource_type: 'image',
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    stream.end(buffer);
  });
};

export const deleteImage = async (publicId: string): Promise<void> => {
  if (!isCloudinaryConfigured() || !publicId) return;
  await cloudinary.uploader.destroy(publicId);
};
