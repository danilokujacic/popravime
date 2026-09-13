import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NominatimClient } from './nominatim.client';
import { GEOCODING_SERVICE } from '../../../common/constants/di-tokens';

@Module({
  imports: [HttpModule],
  providers: [{ provide: GEOCODING_SERVICE, useClass: NominatimClient }],
  exports: [GEOCODING_SERVICE],
})
export class GeocodingModule {}
