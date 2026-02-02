import { Injectable, Logger, NotFoundException, Inject } from '@nestjs/common';
import { Pool, QueryResult } from 'pg';
import { CacheService } from '@apex/cache';

@Injectable()
export class StorefrontService {
    private readonly logger = new Logger(StorefrontService.name);

    constructor(
        @Inject('CACHE_SERVICE') private readonly cacheService: CacheService
    ) { }

    /**
     * Update tenant branding (logo, colors, name) - Phase 5 Protected
     */
    async updateBranding(request: any, dto: any) {
        const tenantId = request.tenantId || request.raw?.tenantId;
        if (!tenantId) throw new Error('TENANT_CONTEXT_MISSING');

        const fields: string[] = [];
        const values: any[] = [];
        let idx = 1;

        if (dto.name) {
            fields.push(`name = $${idx++}`);
            values.push(dto.name);
        }
        if (dto.logoUrl !== undefined) {
            fields.push(`logo_url = $${idx++}`);
            values.push(dto.logoUrl || null); // Support clearing logo
        }
        if (dto.primaryColor) {
            fields.push(`primary_color = $${idx++}`);
            values.push(dto.primaryColor);
        }

        if (fields.length === 0) return { success: true };

        values.push(tenantId);
        await this.query(
            request,
            `UPDATE public.tenants SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );

        await this.invalidateCache(request);
        return { success: true };
    }

    /**
     * Update or Create Hero Banner - Phase 5 Protected
     */
    async updateHero(request: any, dto: any) {
        const tenantId = request.tenantId || request.raw?.tenantId;
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
        if (!tenantId || !tenantSchema) throw new Error('TENANT_CONTEXT_MISSING');

        // Check if a banner exists (limit to 1 for this simple manager)
        const existing = await this.query(request, `SELECT id FROM "${tenantSchema}".banners ORDER BY priority ASC LIMIT 1`);

        if (existing.rows.length > 0) {
            const bannerId = existing.rows[0].id;
            await this.query(
                request,
                `UPDATE "${tenantSchema}".banners SET 
                title = $1, subtitle = $2, image_url = $3, cta_text = $4, cta_url = $5, active = true
                WHERE id = $6`,
                [dto.title, dto.subtitle || null, dto.imageUrl || null, dto.ctaText, dto.ctaUrl, bannerId]
            );
        } else {
            await this.query(
                request,
                `INSERT INTO "${tenantSchema}".banners 
                (title, subtitle, image_url, cta_text, cta_url, active, priority)
                VALUES ($1, $2, $3, $4, $5, true, 0)`,
                [dto.title, dto.subtitle || null, dto.imageUrl || null, dto.ctaText, dto.ctaUrl]
            );
        }

        await this.invalidateCache(request);
        return { success: true };
    }

    /**
     * Get tenant settings (P0 Load Test Target)
     */
    async getSettings(request: any) {
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
        if (!tenantSchema) throw new Error('TENANT_CONTEXT_MISSING');

        const result = await this.query(request, `SELECT * FROM "${tenantSchema}".settings`);
        return result.rows;
    }



    private async query<T = any>(request: any, sql: string, params?: any[]): Promise<QueryResult<T>> {
        const client = request.dbClient || request.raw?.dbClient;
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
        const tenantId = request.tenantId || request.raw?.tenantId;
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
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
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
        try {
            const result = await this.query(
                request,
                `
        SELECT id, title, subtitle, image_url, cta_text, cta_url, priority
        FROM "${tenantSchema}".banners
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
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
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
        FROM "${tenantSchema}".products p
        LEFT JOIN "${tenantSchema}".order_items oi ON oi.product_id = p.id
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
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
        try {
            const result = await this.query(
                request,
                `
        SELECT id, name, slug, image_url, description, product_count
        FROM "${tenantSchema}".categories 
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
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
        try {
            const result = await this.query(
                request,
                `
        SELECT id, title, description, discount_percent, banner_url, starts_at, ends_at
        FROM "${tenantSchema}".promotions 
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
        const tenantSchema = request.tenantSchema || request.raw?.tenantSchema;
        try {
            const result = await this.query(
                request,
                `
        SELECT id, customer_name, rating, review_text, product_name, created_at
        FROM "${tenantSchema}".testimonials 
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
        const tenantId = request.tenantId || request.raw?.tenantId;
        const cacheKey = `storefront:home:${tenantId}`;
        await this.cacheService.del(cacheKey);
        this.logger.log(`Cache invalidated for tenant: ${tenantId}`);
    }

    /**
     * Warm up cache for tenant
     */
    async warmCache(request: any): Promise<void> {
        const tenantId = request.tenantId || request.raw?.tenantId;
        await this.getHomePage(request);
        this.logger.log(`Cache warmed for tenant: ${tenantId}`);
    }
}
