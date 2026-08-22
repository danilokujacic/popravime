export enum Urgency {
  Standard = 'standard',
  Urgent = 'urgent',
}

export enum RequestStatus {
  Open = 'open',
  OffersReceived = 'offers_received',
  Accepted = 'accepted',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export interface RepairRequestPhotoInput {
  buffer: Buffer;
  fileName: string;
  contentType: string;
}

export interface CreateRepairRequestInput {
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
  cityId?: string;
  categoryId?: string;
  customerId?: string;
  urgency?: Urgency;
}
