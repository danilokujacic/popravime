import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { ConfigType } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { ConfigNamespaces } from './config/configuration';
import { EnvValidationSchema } from './config/env.validation';
import { appConfig } from './config/app.config';
import { DatabaseModule } from './database/database.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { CaseTransformInterceptor } from './common/interceptors/case-transform.interceptor';
import { BuildPinoOptions } from './shared/logger/pino.options';
import { HealthModule } from './modules/health/health.module';
import { CacheInfraModule } from './modules/infra/cache/cache.module';
import { RateLimitModule } from './modules/infra/rate-limit/rate-limit.module';
import { QueueModule } from './modules/infra/queue/queue.module';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { CitiesModule } from './modules/cities/cities.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { StorageModule } from './modules/infra/storage/storage.module';
import { EmailModule } from './modules/infra/email/email.module';
import { ProvidersModule } from './modules/providers/providers.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: ConfigNamespaces,
      validationSchema: EnvValidationSchema,
      validationOptions: { abortEarly: false },
    }),
    LoggerModule.forRootAsync({
      inject: [appConfig.KEY],
      useFactory: (config: ConfigType<typeof appConfig>) => BuildPinoOptions(config.nodeEnv),
    }),
    DatabaseModule,
    CacheInfraModule,
    RateLimitModule,
    QueueModule,
    StorageModule,
    EmailModule,
    HealthModule,
    UsersModule,
    AuthModule,
    CitiesModule,
    CategoriesModule,
    ProvidersModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CaseTransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
