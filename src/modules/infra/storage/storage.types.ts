export interface UploadFileInput {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

export interface UploadFileResult {
  key: string;
  url: string;
}

export interface PrivateUploadResult {
  key: string;
  reference: string;
}

export const PRIVATE_REFERENCE_PREFIX = 'private:';
