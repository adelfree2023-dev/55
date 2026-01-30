import { Injectable, Logger } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { sql } from 'drizzle-orm';

@Injectable()
export class DataSeederService {
    private readonly logger = new Logger(DataSeederService.name);
    private static pool = new Pool({ connectionString: process.env.DATABASE_URL });
    private static db = drizzle(this.pool);

    /**
     * Seeds starter data from onboarding blueprint
     * @param tenantId - Tenant identifier
     * @param blueprintId - Blueprint to use (default: 'standard')
     */
    async seedData(tenantId: string, blueprintId: string = 'standard'): Promise<void> {
        const startTime = Date.now();
        const schemaName = `tenant_${tenantId}`;

        this.logger.log(`Seeding data for ${tenantId} using blueprint: ${blueprintId}`);

        try {
            // Fetch blueprint configuration
            const blueprint = await this.getBlueprint(blueprintId);
            if (!blueprint) {
                throw new Error(`Blueprint ${blueprintId} not found`);
            }

            // Create core tables
            await this.createCoreTables(schemaName);

            // Seed products
            if (blueprint.products && blueprint.products.length > 0) {
                await this.seedProducts(schemaName, blueprint.products);
            }

            // Seed pages
            if (blueprint.pages && blueprint.pages.length > 0) {
                await this.seedPages(schemaName, blueprint.pages);
            }

            // Seed settings
            await this.seedSettings(schemaName, blueprint.settings || {});

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Data seeded in ${duration}ms for ${tenantId}`);
        } catch (error) {
            this.logger.error(`Failed to seed data: ${error.message}`);
            throw error;
        }
    }

    /**
     * Creates core tenant tables
     */
    private async createCoreTables(schemaName: string): Promise<void> {
        const queries = [
            // Products table
            `CREATE TABLE IF NOT EXISTS "${schemaName}".products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        images JSONB DEFAULT '[]'::jsonb,
        status VARCHAR(50) DEFAULT 'draft',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

            // Orders table
            `CREATE TABLE IF NOT EXISTS "${schemaName}".orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID,
        status VARCHAR(50) DEFAULT 'pending',
        total DECIMAL(10,2) NOT NULL,
        items JSONB NOT NULL,
        shipping_address JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

            // Pages table
            `CREATE TABLE IF NOT EXISTS "${schemaName}".pages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        content TEXT,
        published BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )`,

            // Settings table
            `CREATE TABLE IF NOT EXISTS "${schemaName}".settings (
        key VARCHAR(255) PRIMARY KEY,
        value TEXT NOT NULL
      )`,
        ];

        for (const query of queries) {
            await DataSeederService.db.execute(sql.raw(query));
        }

        this.logger.debug(`Core tables created for ${schemaName}`);
    }

    /**
     * Seeds products from blueprint
     */
    private async seedProducts(schemaName: string, products: any[]): Promise<void> {
        if (products.length === 0) return;

        const values = products.map(p =>
            `('${p.name}', '${p.slug}', '${p.description || ''}', ${p.price}, ${p.stock || 0}, '${JSON.stringify(p.images || [])}'::jsonb)`
        ).join(',');

        await DataSeederService.db.execute(sql.raw(`
      INSERT INTO "${schemaName}".products (name, slug, description, price, stock, images)
      VALUES ${values}
      ON CONFLICT (slug) DO NOTHING
    `));

        this.logger.debug(`Seeded ${products.length} products`);
    }

    /**
     * Seeds pages from blueprint
     */
    private async seedPages(schemaName: string, pages: any[]): Promise<void> {
        if (pages.length === 0) return;

        const values = pages.map(p =>
            `('${p.title}', '${p.slug}', '${p.content || ''}', true)`
        ).join(',');

        await DataSeederService.db.execute(sql.raw(`
      INSERT INTO "${schemaName}".pages (title, slug, content, published)
      VALUES ${values}
      ON CONFLICT (slug) DO NOTHING
    `));

        this.logger.debug(`Seeded ${pages.length} pages`);
    }

    /**
     * Seeds settings
     */
    private async seedSettings(schemaName: string, settings: Record<string, any>): Promise<void> {
        const entries = Object.entries(settings).map(([key, value]) =>
            `('${key}', '${JSON.stringify(value)}')`
        ).join(',');

        if (entries) {
            await DataSeederService.db.execute(sql.raw(`
        INSERT INTO "${schemaName}".settings (key, value)
        VALUES ${entries}
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
      `));
        }

        this.logger.debug(`Seeded settings`);
    }

    /**
     * Fetches blueprint configuration
     */
    private async getBlueprint(blueprintId: string) {
        const result = await DataSeederService.pool.query(
            `SELECT config FROM public.onboarding_blueprints WHERE name = $1 OR id::text = $1 LIMIT 1`,
            [blueprintId]
        );

        if (result.rows.length === 0) return null;
        return result.rows[0].config;
    }
}
