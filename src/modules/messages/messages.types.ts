export interface CreateMessageInput {
  requestId?: string;
  inquiryId?: string;
  body: string;
  attachment?: {
    buffer: Buffer;
    fileName: string;
    contentType: string;
  };
}

export interface ListMessagesFilter {
  requestId?: string;
  inquiryId?: string;
}
