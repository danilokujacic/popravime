import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TurnstileService } from './turnstile.service';
import { TurnstileGuard } from './turnstile.guard';
import { TURNSTILE_SERVICE } from '../../../common/constants/di-tokens';

@Module({
  imports: [HttpModule],
  providers: [
    { provide: TURNSTILE_SERVICE, useClass: TurnstileService },
    TurnstileGuard,
  ],
  exports: [TURNSTILE_SERVICE, TurnstileGuard],
})
export class TurnstileModule {}
