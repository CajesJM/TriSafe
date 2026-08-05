import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  const configuredOrigins = (config.get<string>('WEB_ORIGIN') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  app.enableCors({
    origin(origin, callback) {
      const isLocalDevelopmentOrigin =
        !isProduction &&
        Boolean(origin?.match(/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/));
      const isAllowed = !origin || configuredOrigins.includes(origin) || isLocalDevelopmentOrigin;
      callback(isAllowed ? null : new Error('Origin is not allowed by TriSafe CORS policy'), isAllowed);
    },
  });
  app.useBodyParser('json', { limit: '2mb' });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  await app.listen(config.get<number>('PORT', 3000));
}

void bootstrap();
