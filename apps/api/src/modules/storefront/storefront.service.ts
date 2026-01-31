import { Injectable, Logger, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Pool, QueryResult } from 'pg';
import { CacheService } from '@apex/cache';

@Injectable({ scope: Scope.REQUEST })
export class StorefrontService {
    private readonly logger = new Logger(StorefrontService.name);
    private readonly tenantId: string;
    private readonly tenantSchema: string;

    constructor(
        @Inject(REQUEST) private readonly request: any,
        @Inject('CACHE_SERVICE') private readonly cacheService: CacheService
    ) {
        this.tenantId = this.request.tenantId;
        this.tenantSchema = this.request.tenantSchema;

        if (!this.tenantId || !this.tenantSchema) {
            this.logger.error('Tenant context missing - request not processed by TenantMiddleware');
        }
    }

    private async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
        const client = this.request.dbClient;
        if (!client) {
            throw new Error('Database client not available on request');
        }
        return client.query(sql, params);
    }

    /**
     * Get home page data for tenant
     * @param tenantId - Tenant subdomain identifier
     * @returns Home page data with sections
     */
    async getHomePage() {
        const tenantId = this.tenantId;
        const cacheKey = `storefront:home:${tenantId}`;

        // CRITICAL: Validate tenant context integrity
        if (!tenantId || tenantId !== this.request.tenantId) {
            throw new Error('TENANT_CONTEXT_CORRUPTION');
        }

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
                `SELECT id, name, logo_url, primary_color, subdomain FROM public.tenants WHERE id = $1 AND status = 'active'`,
                [tenantId]
            );

            if (tenantResult.rows.length === 0) {
                throw new NotFoundException(`Tenant ${tenantId} not found`);
            }

            const tenant = tenantResult.rows[0];

            // Get hero banners
            const banners = await this.getHeroBanners(tenant.id);

            // Get best sellers
            const bestSellers = await this.getBestSellers(tenant.id);

            // Get featured categories
            const categories = await this.getFeaturedCategories(tenant.id);

            // Get promotions
            const promotions = await this.getPromotions(tenant.id);

            // Get testimonials
            const testimonials = await this.getTestimonials(tenant.id);

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
    private async getHeroBanners(tenantId: string) {
        try {
            const result = await this.query(`
        SELECT id, title, subtitle, image_url, cta_text, cta_url, priority
        FROM "${this.tenantSchema}".banners
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
    private async getBestSellers(tenantId: string) {
        try {
            const result = await this.query(`
        SELECT 
          p.id, 
          p.name, 
          p.description, 
          p.price, 
          p.image_url,
          p.stock,
          COALESCE(SUM(oi.quantity), 0) as total_sold
        FROM "${this.tenantSchema}".products p
        LEFT JOIN "${this.tenantSchema}".order_items oi ON oi.product_id = p.id
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
    private async getFeaturedCategories(tenantId: string) {
        try {
            const result = await this.query(`
        SELECT id, name, slug, image_url, description, product_count
        FROM "${this.tenantSchema}".categories 
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
    private async getPromotions(tenantId: string) {
        try {
            const result = await this.query(`
        SELECT id, title, description, discount_percent, banner_url, starts_at, ends_at
        FROM "${this.tenantSchema}".promotions 
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
    private async getTestimonials(tenantId: string) {
        try {
            const result = await this.query(`
        SELECT id, customer_name, rating, review_text, product_name, created_at
        FROM "${this.tenantSchema}".testimonials 
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
    async invalidateCache(): Promise<void> {
        const cacheKey = `storefront:home:${this.tenantId}`;
        await this.cacheService.del(cacheKey);
        this.logger.log(`Cache invalidated for tenant: ${this.tenantId}`);
    }

    /**
     * Warm up cache for tenant
     */
    async warmCache(): Promise<void> {
        await this.getHomePage();
        this.logger.log(`Cache warmed for tenant: ${this.tenantId}`);
    }
}
