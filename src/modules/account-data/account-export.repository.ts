import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccountExportData } from './account-data.types';
import { User } from '../users/entities/user.entity';
import { Provider } from '../providers/entities/provider.entity';
import { RepairRequest } from '../repair-requests/entities/repair-request.entity';
import { Message } from '../messages/entities/message.entity';
import { Review } from '../reviews/entities/review.entity';
import { DirectInquiry } from '../direct-inquiries/entities/direct-inquiry.entity';
import { Notification } from '../notifications/entities/notification.entity';

@Injectable()
export class AccountExportRepository {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Provider)
    private readonly providers: Repository<Provider>,
    @InjectRepository(RepairRequest)
    private readonly repairRequests: Repository<RepairRequest>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectRepository(DirectInquiry)
    private readonly directInquiries: Repository<DirectInquiry>,
    @InjectRepository(Notification)
    private readonly notifications: Repository<Notification>,
  ) {}

  async Collect(userId: string): Promise<AccountExportData | null> {
    const profile = await this.users.findOne({ where: { id: userId } });
    if (!profile) {
      return null;
    }

    const [
      provider,
      repairRequests,
      messagesSent,
      reviewsWritten,
      directInquiries,
      notifications,
    ] = await Promise.all([
      this.providers.findOne({ where: { ownerUserId: userId } }),
      this.repairRequests.find({ where: { customerId: userId } }),
      this.messages.find({ where: { senderId: userId } }),
      this.reviews.find({ where: { customerId: userId } }),
      this.directInquiries.find({ where: { customerId: userId } }),
      this.notifications.find({ where: { userId } }),
    ]);

    return {
      profile,
      provider,
      repairRequests,
      messagesSent,
      reviewsWritten,
      directInquiries,
      notifications,
    };
  }
}
