export class MessageResponseDto {
  id: string;
  requestId: string | null;
  inquiryId: string | null;
  senderId: string;
  body: string;
  attachmentUrl: string | null;
  isRead: boolean;
  createdAt: Date;
}
