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

    @Get(':tenantId/home')
    @ApiOperation({
        summary: 'Get home page data (Store-#01)',
        description: 'Returns tenant-specific home page with banners, best sellers, categories, promotions, and testimonials'
    })
    @ApiParam({ name: 'tenantId', description: 'Tenant subdomain identifier', example: 'demo-store' })
    @ApiResponse({ status: 200, description: 'Home page data retrieved successfully' })
    @ApiResponse({ status: 404, description: 'Tenant not found' })
    @HttpCode(200)
    async getHomePage(@Param('tenantId') tenantId: string) {
        this.logger.log(`GET /storefront/${tenantId}/home`);
        return this.storefrontService.getHomePage(tenantId);
    }

    @Get(':tenantId/home/refresh')
    @ApiOperation({
        summary: 'Refresh home page cache',
        description: 'Invalidates and regenerates cache for tenant home page'
    })
    @ApiParam({ name: 'tenantId', description: 'Tenant subdomain identifier', example: 'demo-store' })
    @ApiResponse({ status: 200, description: 'Cache refreshed successfully' })
    @HttpCode(200)
    async refreshHomePage(@Param('tenantId') tenantId: string) {
        this.logger.log(`Refreshing cache for tenant: ${tenantId}`);
        await this.storefrontService.invalidateCache(tenantId);
        await this.storefrontService.warmCache(tenantId);
        return {
            success: true,
            message: `Cache refreshed for ${tenantId}`,
            timestamp: new Date().toISOString()
        };
    }
}
