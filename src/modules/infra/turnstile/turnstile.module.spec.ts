import { Controller, Module, Post } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { LoggerModule } from 'nestjs-pino';
import { RequireTurnstile } from './require-turnstile.decorator';
import { TurnstileGuard } from './turnstile.guard';
import { TurnstileModule } from './turnstile.module';
import { TURNSTILE_SERVICE } from '../../../common/constants/di-tokens';
import { turnstileConfig } from '../../../config/turnstile.config';
import { TurnstileService } from './turnstile.service';

@Controller('probe')
class ProbeController {
  @RequireTurnstile()
  @Post()
  Create(): void {}
}

@Module({ imports: [TurnstileModule], controllers: [ProbeController] })
class ConsumerModule {}

describe('TurnstileModule', () => {
  it('resolves the service and the guard inside a consuming module', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, load: [turnstileConfig] }),
        LoggerModule.forRoot({ pinoHttp: { level: 'silent' } }),
        ConsumerModule,
      ],
    }).compile();

    expect(moduleRef.get(TURNSTILE_SERVICE, { strict: false })).toBeInstanceOf(
      TurnstileService,
    );
    expect(moduleRef.get(TurnstileGuard, { strict: false })).toBeInstanceOf(
      TurnstileGuard,
    );
    await moduleRef.close();
  });
});
