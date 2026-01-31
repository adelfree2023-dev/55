import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { env } from '@apex/config';
import * as Sentry from '@sentry/node';

// Initialize Sentry for production error monitoring
if (process.env.SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.SENTRY_ENVIRONMENT || 'production',
        tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),
        release: process.env.SENTRY_RELEASE || 'apex-platform@1.0.0',
    });
    console.log('✅ Sentry initialized for error monitoring');
}

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter({ trustProxy: true })
    );

    await app.listen(env.PORT, '0.0.0.0');
    console.log(`🚀 API is running on: http://localhost:${env.PORT}`);
}
bootstrap();
