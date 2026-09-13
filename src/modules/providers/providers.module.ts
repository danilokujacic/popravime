import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Provider } from './entities/provider.entity';
import { ProviderCategory } from './entities/provider-category.entity';
import { ProviderGallery } from './entities/provider-gallery.entity';
import { ProviderRepository } from './repositories/provider.repository';
import { ProviderCategoryRepository } from './repositories/provider-category.repository';
import { ProviderGalleryRepository } from './repositories/provider-gallery.repository';
import { ProvidersService } from './providers.service';
import { ProviderGalleryService } from './provider-gallery.service';
import { ProvidersController } from './providers.controller';
import { CitiesModule } from '../cities/cities.module';
import { StorageModule } from '../infra/storage/storage.module';
import { GeocodingModule } from '../infra/geocoding/geocoding.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Provider, ProviderCategory, ProviderGallery]),
    CitiesModule,
    StorageModule,
    GeocodingModule,
  ],
  controllers: [ProvidersController],
  providers: [
    ProviderRepository,
    ProviderCategoryRepository,
    ProviderGalleryRepository,
    ProvidersService,
    ProviderGalleryService,
  ],
  exports: [ProvidersService],
})
export class ProvidersModule {}
