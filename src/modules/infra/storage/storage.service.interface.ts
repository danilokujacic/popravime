import {
  PrivateUploadResult,
  UploadFileInput,
  UploadFileResult,
} from './storage.types';

export interface StorageService {
  Upload(input: UploadFileInput): Promise<UploadFileResult>;
  UploadPrivate(input: UploadFileInput): Promise<PrivateUploadResult>;
  Delete(key: string): Promise<void>;
  DeletePrivate(key: string): Promise<void>;
  GetUrl(key: string): string;
  ExtractKey(url: string): string | null;
  ExtractPrivateKey(reference: string): string | null;
  SignUrl(key: string): Promise<string>;
}
