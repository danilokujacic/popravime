import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceEstimate } from './entities/price-estimate.entity';
import { PriceEstimatesRepository } from './price-estimates.repository';
import { PriceEstimatesService } from './price-estimates.service';
import { PriceEstimatesController } from './price-estimates.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PriceEstimate])],
  controllers: [PriceEstimatesController],
  providers: [PriceEstimatesRepository, PriceEstimatesService],
  exports: [PriceEstimatesService],
})
export class PriceEstimatesModule {}
