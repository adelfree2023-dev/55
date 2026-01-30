import { Module } from '@nestjs/common';
import { StorefrontController } from './storefront.controller';
import { StorefrontService } from './storefront.service';
import { CacheService } from '@apex/cache';

@Module({
    imports: [],
    controllers: [StorefrontController],
    providers: [
        {
            provide: 'STOREFRONT_SERVICE',
            useClass: StorefrontService,
        },
        {
            provide: 'CACHE_SERVICE',
            useClass: CacheService,
        },
        StorefrontService,
        CacheService,
    ],
    exports: ['STOREFRONT_SERVICE', 'CACHE_SERVICE', StorefrontService, CacheService],
})
export class StorefrontModule { }
