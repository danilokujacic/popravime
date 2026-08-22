export interface UploadFileInput {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

export interface UploadFileResult {
  key: string;
  url: string;
}
