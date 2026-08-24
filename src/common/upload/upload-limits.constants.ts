import { UnsupportedMediaTypeException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const IMAGE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const DOCUMENT_MIME_TYPES = new Set([...IMAGE_MIME_TYPES, 'application/pdf']);

const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

function BuildFileFilter(allowed: Set<string>): MulterOptions['fileFilter'] {
  return (_req, file, callback) => {
    if (!allowed.has(file.mimetype)) {
      callback(
        new UnsupportedMediaTypeException(
          `Unsupported file type: ${file.mimetype}`,
        ),
        false,
      );
      return;
    }
    callback(null, true);
  };
}

export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: { fileSize: IMAGE_MAX_BYTES },
  fileFilter: BuildFileFilter(IMAGE_MIME_TYPES),
};

export const DOCUMENT_UPLOAD_OPTIONS: MulterOptions = {
  limits: { fileSize: DOCUMENT_MAX_BYTES },
  fileFilter: BuildFileFilter(DOCUMENT_MIME_TYPES),
};
