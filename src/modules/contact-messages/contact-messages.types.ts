export enum ContactMessageStatus {
  New = 'new',
  InProgress = 'in_progress',
  Resolved = 'resolved',
}

export interface CreateContactMessageInput {
  name: string;
  email: string;
  subject: string;
  message: string;
}

export interface ListContactMessagesFilter {
  status?: ContactMessageStatus;
}
