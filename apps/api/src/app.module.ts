import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AuditLoggerInterceptor } from '@apex/security';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ProvisioningModule } from './modules/provisioning/provisioning.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthController } from './common/controllers/health.controller';

@Module({
    imports: [
        EventEmitterModule.forRoot(),
        ProvisioningModule,
        StorefrontModule,
    ],
    controllers: [HealthController],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditLoggerInterceptor,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(TenantMiddleware)
            .exclude('provisioning/(.*)')
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
