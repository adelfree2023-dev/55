import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { env } from '@apex/config';

async function bootstrap() {
    const app = await NestFactory.create<NestFastifyApplication>(
        AppModule,
        new FastifyAdapter()
    );

    await app.listen(env.PORT, '0.0.0.0');
    console.log(`🚀 API is running on: http://localhost:${env.PORT}`);
}
bootstrap();
