import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UsersModule } from '../users/users.module';
import { EmailModule } from '../infra/email/email.module';
import { EmailConfirmationsModule } from '../email-confirmations/email-confirmations.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OAuthExchangeService } from './oauth-exchange.service';
import { AccessTokenStrategy } from './strategies/access-token.strategy';
import { RefreshTokenStrategy } from './strategies/refresh-token.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { FacebookStrategy } from './strategies/facebook.strategy';
import { RefreshTokenDenylistService } from './refresh-token-denylist.service';
import { AccountRevocationService } from './account-revocation.service';

@Module({
  imports: [
    UsersModule,
    EmailModule,
    EmailConfirmationsModule,
    PassportModule,
    JwtModule.register({}),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    OAuthExchangeService,
    AccessTokenStrategy,
    RefreshTokenStrategy,
    GoogleStrategy,
    FacebookStrategy,
    RefreshTokenDenylistService,
    AccountRevocationService,
  ],
  exports: [AuthService, AccountRevocationService],
})
export class AuthModule {}
