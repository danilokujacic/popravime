import { RequestStatus, Urgency } from '../repair-requests.types';

export class RepairRequestResponseDto {
  id: string;
  customerId: string;
  categoryId: string;
  brand: string | null;
  model: string | null;
  description: string;
  photoUrls: string[];
  cityId: string;
  urgency: Urgency;
  status: RequestStatus;
  acceptedOfferId: string | null;
  createdAt: Date;
}
