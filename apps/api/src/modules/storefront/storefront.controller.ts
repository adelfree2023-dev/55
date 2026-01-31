import { Controller, Get, Param, UseInterceptors, Logger, HttpCode, Inject } from '@nestjs/common';
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
    async getHomePage() {
        this.logger.log(`GET /storefront/home`);
        return this.storefrontService.getHomePage();
    }

    @Get('home/refresh')
    @ApiOperation({
        summary: 'Refresh home page cache',
        description: 'Invalidates and regenerates cache for tenant home page'
    })
    @ApiResponse({ status: 200, description: 'Cache refreshed successfully' })
    @HttpCode(200)
    async refreshHomePage() {
        this.logger.log('Refreshing cache for current tenant');
        await this.storefrontService.invalidateCache();
        await this.storefrontService.warmCache();
        return {
            success: true,
            message: 'Cache refreshed for current tenant',
            timestamp: new Date().toISOString()
        };
    }
}
