import { Body, Controller, Get, Patch } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UserResponseMapper } from './mappers/user-response.mapper';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/interfaces/authenticated-request.interface';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async GetMe(
    @CurrentUser() currentUser: AuthenticatedUser,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.FindById(currentUser.id);
    return UserResponseMapper.ToDto(user);
  }

  @Patch('me')
  async UpdateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    const user = await this.usersService.Update(currentUser.id, {
      fullName: dto.fullName,
      phone: dto.phone,
      locale: dto.locale,
    });
    return UserResponseMapper.ToDto(user);
  }
}
