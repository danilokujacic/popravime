import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProviderGallery } from '../entities/provider-gallery.entity';

@Injectable()
export class ProviderGalleryRepository {
  constructor(
    @InjectRepository(ProviderGallery)
    private readonly repository: Repository<ProviderGallery>,
  ) {}

  List(providerId: string): Promise<ProviderGallery[]> {
    return this.repository.find({
      where: { providerId },
      order: { sortOrder: 'ASC' },
    });
  }

  async Add(image: Partial<ProviderGallery>): Promise<ProviderGallery> {
    const entity = this.repository.create(image);
    return this.repository.save(entity);
  }

  FindById(id: string): Promise<ProviderGallery | null> {
    return this.repository.findOne({ where: { id } });
  }

  async Delete(id: string): Promise<void> {
    await this.repository.delete({ id });
  }
}
