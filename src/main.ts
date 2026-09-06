import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { initializeTransactionalContext } from 'typeorm-transactional';
import helmet from 'helmet';
import compression from 'compression';
import type { ConfigType } from '@nestjs/config';
import { AppModule } from './app.module';
import { appConfig } from './config/app.config';
import { ValidationFieldsException } from './common/exceptions/validation-fields.exception';
import { BuildValidationFields } from './common/validation/build-validation-fields';

async function Bootstrap(): Promise<void> {
  initializeTransactionalContext();

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.enableShutdownHooks();

  const config = app.get<ConfigType<typeof appConfig>>(appConfig.KEY);

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: config.corsOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const fields = BuildValidationFields(errors);
        const message = errors
          .flatMap((error) => Object.values(error.constraints ?? {}))
          .join(', ');
        return new ValidationFieldsException(fields, message);
      },
    }),
  );

  if (config.nodeEnv !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Popravime API')
      .setDescription('Repair marketplace backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.port, '127.0.0.1');
}

void Bootstrap();
