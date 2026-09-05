export enum Urgency {
  Standard = 'standard',
  Urgent = 'urgent',
}

export enum RequestStatus {
  PendingReview = 'pending_review',
  Open = 'open',
  OffersReceived = 'offers_received',
  Accepted = 'accepted',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
  Rejected = 'rejected',
}

export interface RepairRequestPhotoInput {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

export interface CreateRepairRequestInput {
  customerId: string;
  categoryId: string;
  brand?: string;
  model?: string;
  description: string;
  photos?: RepairRequestPhotoInput[];
  cityId: string;
  urgency: Urgency;
}

export interface ListRepairRequestsFilter {
  status?: RequestStatus;
  excludedStatuses?: RequestStatus[];
  cityId?: string;
  categoryId?: string;
  categoryIds?: string[];
  customerId?: string;
  urgency?: Urgency;
}
