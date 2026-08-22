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

export interface CreateRepairRequestInput {
  categoryId: string;
  brand?: string;
  model?: string;
  description: string;
  photoUrls?: string[];
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
