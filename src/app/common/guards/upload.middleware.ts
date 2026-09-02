import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../exceptions/app-error.exception.ts';
import { HTTP_STATUS } from '../constants/http-status.constants.ts';

const storage = multer.memoryStorage();

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    cb(new AppError('Only image files are allowed', HTTP_STATUS.BAD_REQUEST));
    return;
  }
  cb(null, true);
};

const uploader = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
});

export const optionalImageUpload = (fieldName: string) => {
  const handler = uploader.single(fieldName);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.is('multipart/form-data')) {
      next();
      return;
    }

    handler(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        next(new AppError(err.message, HTTP_STATUS.BAD_REQUEST));
        return;
      }
      next(err);
    });
  };
};
