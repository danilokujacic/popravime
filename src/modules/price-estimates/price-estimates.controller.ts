import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PriceEstimatesService } from './price-estimates.service';
import { CreatePriceEstimateDto } from './dto/create-price-estimate.dto';
import { UpdatePriceEstimateDto } from './dto/update-price-estimate.dto';
import { ListPriceEstimatesQueryDto } from './dto/list-price-estimates-query.dto';
import { PriceEstimateResponseDto } from './dto/price-estimate-response.dto';
import { PriceEstimateResponseMapper } from './mappers/price-estimate-response.mapper';
import { Public } from '../../common/decorators/public.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';
import { UserRole } from '../users/users.types';

@Controller('price-estimates')
export class PriceEstimatesController {
  constructor(private readonly priceEstimatesService: PriceEstimatesService) {}

  @Public()
  @Get()
  async List(
    @Query() query: ListPriceEstimatesQueryDto,
  ): Promise<PriceEstimateResponseDto[]> {
    const estimates = await this.priceEstimatesService.List({
      categoryId: query.categoryId,
    });
    return estimates.map(PriceEstimateResponseMapper.ToDto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Post()
  async Create(
    @Body() dto: CreatePriceEstimateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PriceEstimateResponseDto> {
    const estimate = await this.priceEstimatesService.Create(user.id, {
      categoryId: dto.categoryId,
      serviceType: dto.serviceType,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      currency: dto.currency,
    });
    return PriceEstimateResponseMapper.ToDto(estimate);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Patch(':id')
  async Update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePriceEstimateDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PriceEstimateResponseDto> {
    const estimate = await this.priceEstimatesService.Update(id, user.id, {
      serviceType: dto.serviceType,
      priceMin: dto.priceMin,
      priceMax: dto.priceMax,
      currency: dto.currency,
    });
    return PriceEstimateResponseMapper.ToDto(estimate);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.Admin)
  @Delete(':id')
  Remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    return this.priceEstimatesService.Delete(id, user.id);
  }
}
