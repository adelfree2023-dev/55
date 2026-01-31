import { Controller, Get, Param, UseInterceptors, Logger, HttpCode, Inject, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { StorefrontService } from './storefront.service';

@ApiTags('Storefront')
@Controller('storefront')
export class StorefrontController {
    private readonly logger = new Logger(StorefrontController.name);

    constructor(
        @Inject('STOREFRONT_SERVICE')
        private readonly storefrontService: StorefrontService
    ) {
        this.logger.log('StorefrontController initialized');
        if (!this.storefrontService) {
            this.logger.error('CRITICAL: StorefrontService failed to inject!');
        } else {
            this.logger.log('StorefrontService successfully injected');
        }
    }

    @Get('home')
    @ApiOperation({
        summary: 'Get home page data (Store-#01)',
        description: 'Returns tenant-specific home page with banners, best sellers, categories, promotions, and testimonials'
    })
    @ApiResponse({ status: 200, description: 'Home page data retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    @HttpCode(200)
    async getHomePage(@Req() request: any) {
        this.logger.log(`GET /storefront/home - Keys: ${Object.keys(request).join(', ')}`);
        this.logger.log(`GET /storefront/home - Raw Keys: ${request.raw ? Object.keys(request.raw).join(', ') : 'no raw'}`);
        this.logger.log(`GET /storefront/home - Tenant: ${request.tenantId || 'null'}, Raw Tenant: ${request.raw?.tenantId || 'null'}`);
        return this.storefrontService.getHomePage(request);
    }

    @Get('home/refresh')
    @ApiOperation({
        summary: 'Refresh home page cache',
        description: 'Invalidates and regenerates cache for tenant home page'
    })
    @ApiResponse({ status: 200, description: 'Cache refreshed successfully' })
    @HttpCode(200)
    async refreshHomePage(@Req() request: any) {
        this.logger.log('Refreshing cache for current tenant');
        await this.storefrontService.invalidateCache(request);
        await this.storefrontService.warmCache(request);
        return {
            success: true,
            message: 'Cache refreshed for current tenant',
            timestamp: new Date().toISOString()
        };
    }
}
