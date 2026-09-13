import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailConfirmation } from './entities/email-confirmation.entity';
import {
  IsQueryFailedError,
  PersistenceErrorMapper,
} from '../../database/persistence-error.mapper';

@Injectable()
export class EmailConfirmationsRepository {
  constructor(
    @InjectRepository(EmailConfirmation)
    private readonly repository: Repository<EmailConfirmation>,
  ) {}

  FindBySlug(slug: string): Promise<EmailConfirmation | null> {
    return this.repository.findOne({ where: { slug } });
  }

  async Create(record: Partial<EmailConfirmation>): Promise<EmailConfirmation> {
    try {
      const entity = this.repository.create(record);
      return await this.repository.save(entity);
    } catch (error) {
      if (IsQueryFailedError(error)) {
        throw PersistenceErrorMapper.ToDomain(error);
      }
      throw error;
    }
  }

  async DeleteById(id: string): Promise<void> {
    await this.repository.delete({ id });
  }

  // Invalidates any earlier still-outstanding links for this email before issuing a fresh one
  // (register resent, or a plain resend request) — otherwise multiple valid links for the same
  // account could be floating around at once.
  async DeleteAllForEmail(email: string): Promise<void> {
    await this.repository.delete({ email });
  }
}
