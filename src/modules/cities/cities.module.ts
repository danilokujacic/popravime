import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from './entities/city.entity';
import { CitiesRepository } from './cities.repository';
import { CitiesService } from './cities.service';
import { CitiesController } from './cities.controller';
import { GeocodingModule } from '../infra/geocoding/geocoding.module';

@Module({
  imports: [TypeOrmModule.forFeature([City]), GeocodingModule],
  controllers: [CitiesController],
  providers: [CitiesRepository, CitiesService],
  exports: [CitiesService],
})
export class CitiesModule {}
