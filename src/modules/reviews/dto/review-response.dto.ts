export class ReviewResponseDto {
  id: string;
  requestId: string | null;
  customerId: string;
  providerId: string;
  rating: number;
  comment: string;
  providerResponse: string | null;
  isPublished: boolean;
  createdAt: Date;
}
