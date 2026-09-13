import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CitiesService } from './cities.service';
import { ListCitiesQueryDto } from './dto/list-cities-query.dto';
import { LookupCityByCoordinatesQueryDto } from './dto/lookup-city-by-coordinates-query.dto';
import { CityResponseDto } from './dto/city-response.dto';
import { CityLookupResponseDto } from './dto/city-lookup-response.dto';
import { CityResponseMapper } from './mappers/city-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { GEOCODING_THROTTLE } from '../infra/rate-limit/rate-limit.constants';

@Controller('cities')
export class CitiesController {
  constructor(private readonly citiesService: CitiesService) {}

  @Public()
  @Get()
  async List(@Query() query: ListCitiesQueryDto): Promise<CityResponseDto[]> {
    const cities = await this.citiesService.List({
      region: query.region,
      isActive: query.isActive,
    });
    return cities.map(CityResponseMapper.ToDto);
  }

  // Route registered before ':id' so 'lookup-by-coordinates' isn't swallowed by the UUID param.
  @Public()
  @Throttle(GEOCODING_THROTTLE)
  @Get('lookup-by-coordinates')
  async LookupByCoordinates(
    @Query() query: LookupCityByCoordinatesQueryDto,
  ): Promise<CityLookupResponseDto> {
    const city = await this.citiesService.FindByCoordinates(
      query.latitude,
      query.longitude,
    );
    return { city: city ? CityResponseMapper.ToDto(city) : null };
  }

  @Public()
  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CityResponseDto> {
    const city = await this.citiesService.FindById(id);
    return CityResponseMapper.ToDto(city);
  }
}
