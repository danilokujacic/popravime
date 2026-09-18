import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersRepository } from './users.repository';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PasswordHasher } from '../../shared/password/password-hasher';
import { TermsAcceptanceService } from './terms-acceptance.service';
import { TermsAcceptanceGuard } from './guards/terms-acceptance.guard';
import { TermsAcceptance } from './entities/terms-acceptance.entity';
import { TermsAcceptancesRepository } from './terms-acceptances.repository';

@Module({
  imports: [TypeOrmModule.forFeature([User, TermsAcceptance])],
  controllers: [UsersController],
  providers: [
    UsersRepository,
    TermsAcceptancesRepository,
    UsersService,
    PasswordHasher,
    TermsAcceptanceService,
    TermsAcceptanceGuard,
  ],
  exports: [
    UsersService,
    PasswordHasher,
    TermsAcceptanceService,
    TermsAcceptanceGuard,
  ],
})
export class UsersModule {}
