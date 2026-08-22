import { UploadFileInput, UploadFileResult } from './storage.types';

export interface StorageService {
  Upload(input: UploadFileInput): Promise<UploadFileResult>;
  Delete(key: string): Promise<void>;
  GetUrl(key: string): string;
}
