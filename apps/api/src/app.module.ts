import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AuditLoggerInterceptor } from '@apex/audit';
import { RateLimiterMiddleware, HelmetMiddleware, GlobalExceptionFilter, TenantScopeGuard } from '@apex/security';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { ProvisioningModule } from './modules/provisioning/provisioning.module';
import { RedisModule } from '@apex/redis';
import { CacheModule } from '@apex/cache';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { HealthController } from './common/controllers/health.controller';

@Module({
    imports: [
        EventEmitterModule.forRoot(),
        RedisModule,
        CacheModule,
        ProvisioningModule,
        StorefrontModule,
        TenantsModule,
        IdentityModule,
    ],
    controllers: [HealthController],
    providers: [
        {
            provide: APP_INTERCEPTOR,
            useClass: AuditLoggerInterceptor,
        },
        {
            provide: APP_FILTER,
            useClass: GlobalExceptionFilter,
        },
        {
            provide: APP_GUARD,
            useClass: TenantScopeGuard,
        },
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(HelmetMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });

        consumer
            .apply(TenantMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });

        consumer
            .apply(RateLimiterMiddleware)
            .forRoutes({ path: '*', method: RequestMethod.ALL });
    }
}
