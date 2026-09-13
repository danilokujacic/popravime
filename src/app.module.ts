import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule } from 'nestjs-cls';
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
import { CorrelationClsSetup } from './common/middleware/correlation-cls.setup';
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
import { RepairRequestsModule } from './modules/repair-requests/repair-requests.module';
import { OffersModule } from './modules/offers/offers.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { DirectInquiriesModule } from './modules/direct-inquiries/direct-inquiries.module';
import { MessagesModule } from './modules/messages/messages.module';
import { VerificationRequestsModule } from './modules/verification-requests/verification-requests.module';
import { BlogPostsModule } from './modules/blog-posts/blog-posts.module';
import { FaqItemsModule } from './modules/faq-items/faq-items.module';
import { PriceEstimatesModule } from './modules/price-estimates/price-estimates.module';
import { ContactMessagesModule } from './modules/contact-messages/contact-messages.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AdminModule } from './modules/admin/admin.module';

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
      useFactory: (config: ConfigType<typeof appConfig>) =>
        BuildPinoOptions(config.nodeEnv),
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: CorrelationClsSetup,
      },
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
    RepairRequestsModule,
    OffersModule,
    NotificationsModule,
    ReviewsModule,
    DirectInquiriesModule,
    MessagesModule,
    VerificationRequestsModule,
    BlogPostsModule,
    FaqItemsModule,
    PriceEstimatesModule,
    ContactMessagesModule,
    AuditLogsModule,
    AdminModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: DomainExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: CaseTransformInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
