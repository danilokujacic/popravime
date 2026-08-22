export enum VerificationStatus {
  Pending = 'pending',
  Verified = 'verified',
  Rejected = 'rejected',
}

export type Weekday =
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface WorkingHoursRange {
  open: string;
  close: string;
}

export type WorkingHours = Partial<Record<Weekday, WorkingHoursRange | null>>;

export interface CreateProviderInput {
  businessName: string;
  description?: string;
  address: string;
  cityId: string;
  phone?: string;
  email?: string;
  website?: string;
  workingHours?: WorkingHours;
  categoryIds: string[];
}

export interface UpdateProviderInput {
  businessName?: string;
  description?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  workingHours?: WorkingHours;
}

export interface AddGalleryImageInput {
  buffer: Buffer;
  fileName: string;
  contentType: string;
  caption?: string;
}

export interface ListProvidersFilter {
  cityId?: string;
  categoryId?: string;
  search?: string;
  verificationStatus?: VerificationStatus;
}

