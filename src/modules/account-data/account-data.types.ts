import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { Message } from '../messages/entities/message.entity';
import { Review } from '../reviews/entities/review.entity';
import { DirectInquiry } from '../direct-inquiries/entities/direct-inquiry.entity';
import { Notification } from '../notifications/entities/notification.entity';

export interface AccountExportData {
  profile: User;
  provider: Provider | null;
  repairRequests: RepairRequest[];
  messagesSent: Message[];
  reviewsWritten: Review[];
  directInquiries: DirectInquiry[];
  notifications: Notification[];
}

export interface AccountExport extends AccountExportData {
  exportedAt: Date;
}
