import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { CacheService } from '@apex/cache';

@Injectable()
export class StorefrontService {
    private readonly logger = new Logger(StorefrontService.name);

    constructor(
        @Inject('CACHE_SERVICE') private readonly cacheService: CacheService
    ) { }

    private async query<T = any>(request: any, sql: string, params?: any[]): Promise<QueryResult<T>> {
        const client = request.dbClient;
        if (!client) {
            throw new Error('Database client not available on request');
        }
        return client.query(sql, params);
    }

    /**
     * Get home page data for tenant
     * @param request - Request object with tenant context from TenantMiddleware
     * @returns Home page data with sections
     */
    async getHomePage(request: any) {
        const tenantId = request.tenantId;
        const cacheKey = `storefront:home:${tenantId}`;

        // CRITICAL: Validate tenant context integrity
        if (!tenantId) {
            this.logger.error('Tenant context missing - request not processed by TenantMiddleware');
            throw new Error('TENANT_CONTEXT_MISSING');
        }

        this.logger.log(`Getting home page for tenant: ${tenantId}`);



        // Try to get from cache first
        const cached = await this.cacheService.get(cacheKey);
        if (cached) {
            this.logger.debug(`Cache hit for tenant: ${tenantId}`);
            return cached;
        }

        this.logger.debug(`Cache miss for tenant: ${tenantId}, fetching from DB`);

        try {
            // Get tenant info
            const tenantResult = await this.query(
                request,
                `SELECT id, name, logo_url, primary_color, subdomain FROM public.tenants WHERE id = $1 AND status = 'active'`,
                [tenantId]
            );

            if (tenantResult.rows.length === 0) {
                throw new NotFoundException(`Tenant ${tenantId} not found`);
            }

            const tenant = tenantResult.rows[0];

            // Get hero banners
            const banners = await this.getHeroBanners(request, tenant.id);

            // Get best sellers
            const bestSellers = await this.getBestSellers(request, tenant.id);

            // Get featured categories
            const categories = await this.getFeaturedCategories(request, tenant.id);

            // Get promotions
            const promotions = await this.getPromotions(request, tenant.id);

            // Get testimonials
            const testimonials = await this.getTestimonials(request, tenant.id);

            const homeData = {
                tenant: {
                    id: tenant.id,
                    name: tenant.name,
                    subdomain: tenant.subdomain,
                    logoUrl: tenant.logo_url,
                    primaryColor: tenant.primary_color,
                },
                sections: {
                    hero: banners,
                    bestSellers,
                    categories,
                    promotions,
                    testimonials,
                },
                metadata: {
                    lastUpdated: new Date().toISOString(),
                    cacheTTL: 300, // 5 minutes
                },
            };

            // Cache the result
            await this.cacheService.set(cacheKey, homeData, 300);

            return homeData;
        } catch (error: any) {
            this.logger.error(`Failed to get home page for ${tenantId}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get hero banners from tenant schema
     */
    private async getHeroBanners(request: any, tenantId: string) {
        try {
            const result = await this.query(
                request,
                `
        SELECT id, title, subtitle, image_url, cta_text, cta_url, priority
        FROM "${request.tenantSchema}".banners
        WHERE active = true 
        ORDER BY priority ASC, created_at DESC
        LIMIT 5
      `);
            return result.rows;
        } catch (error: any) {
            this.logger.warn(`No banners table for tenant ${tenantId}: ${error.message}`);
            return [];
        }
    }

    /**
     * Get best selling products
     */
    private async getBestSellers(request: any, tenantId: string) {
        try {
            const result = await this.query(
                request,
                `
        SELECT 
          p.id, 
          p.name, 
          p.description, 
          p.price, 
          p.image_url,
          p.stock,
          COALESCE(SUM(oi.quantity), 0) as total_sold
        FROM "${request.tenantSchema}".products p
        LEFT JOIN "${request.tenantSchema}".order_items oi ON oi.product_id = p.id
        WHERE p.status = 'published' AND p.stock > 0
        GROUP BY p.id
        ORDER BY total_sold DESC, p.created_at DESC
        LIMIT 8
      `);
            return result.rows;
        } catch (error: any) {
            this.logger.warn(`No products table for tenant ${tenantId}: ${error.message}`);
            return [];
        }
    }

    /**
     * Get featured categories
     */
    private async getFeaturedCategories(request: any, tenantId: string) {
        try {
            const result = await this.query(
                request,
                `
        SELECT id, name, slug, image_url, description, product_count
        FROM "${request.tenantSchema}".categories 
        WHERE featured = true AND active = true
        ORDER BY priority ASC, name ASC
        LIMIT 6
      `);
            return result.rows;
        } catch (error: any) {
            this.logger.warn(`No categories table for tenant ${tenantId}: ${error.message}`);
            return [];
        }
    }

    /**
     * Get active promotions
     */
    private async getPromotions(request: any, tenantId: string) {
        try {
            const result = await this.query(
                request,
                `
        SELECT id, title, description, discount_percent, banner_url, starts_at, ends_at
        FROM "${request.tenantSchema}".promotions 
        WHERE active = true 
        AND (starts_at IS NULL OR starts_at <= NOW())
        AND (ends_at IS NULL OR ends_at >= NOW())
        ORDER BY priority ASC, created_at DESC
        LIMIT 3
      `);
            return result.rows;
        } catch (error: any) {
            this.logger.warn(`No promotions table for tenant ${tenantId}: ${error.message}`);
            return [];
        }
    }

    /**
     * Get customer testimonials
     */
    private async getTestimonials(request: any, tenantId: string) {
        try {
            const result = await this.query(
                request,
                `
        SELECT id, customer_name, rating, review_text, product_name, created_at
        FROM "${request.tenantSchema}".testimonials 
        WHERE published = true 
        ORDER BY rating DESC, created_at DESC
        LIMIT 6
      `);
            return result.rows;
        } catch (error: any) {
            this.logger.warn(`No testimonials table for tenant ${tenantId}: ${error.message}`);
            return [];
        }
    }

    /**
     * Invalidate cache for tenant home page
     */
    async invalidateCache(request: any): Promise<void> {
        const tenantId = request.tenantId;
        const cacheKey = `storefront:home:${tenantId}`;
        await this.cacheService.del(cacheKey);
        this.logger.log(`Cache invalidated for tenant: ${tenantId}`);
    }

    /**
     * Warm up cache for tenant
     */
    async warmCache(request: any): Promise<void> {
        const tenantId = request.tenantId;
        await this.getHomePage(request);
        this.logger.log(`Cache warmed for tenant: ${tenantId}`);
    }
}
