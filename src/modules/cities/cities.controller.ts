import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CitiesService } from './cities.service';
import { ListCitiesQueryDto } from './dto/list-cities-query.dto';
import { CityResponseDto } from './dto/city-response.dto';
import { CityResponseMapper } from './mappers/city-response.mapper';
import { Public } from '../../common/decorators/public.decorator';

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

  @Public()
  @Get(':id')
  async FindOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CityResponseDto> {
    const city = await this.citiesService.FindById(id);
    return CityResponseMapper.ToDto(city);
  }
}
