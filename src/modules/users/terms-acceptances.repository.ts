import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TermsAcceptance } from './entities/terms-acceptance.entity';

@Injectable()
export class TermsAcceptancesRepository {
  constructor(
    @InjectRepository(TermsAcceptance)
    private readonly repository: Repository<TermsAcceptance>,
  ) {}

  Create(acceptance: Partial<TermsAcceptance>): Promise<TermsAcceptance> {
    return this.repository.save(this.repository.create(acceptance));
  }
}
