import { Injectable, Logger, BadRequestException, InternalServerErrorException, Optional, Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { SchemaCreatorService, DataSeederService, TraefikRouterService } from '@apex/provisioning';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TenantProvisionedEvent } from './events/tenant-provisioned.event';
import { TenantFailedEvent } from './events/tenant-failed.event';
import { EncryptionService } from '@apex/encryption';

@Injectable()
export class ProvisioningService {
    private readonly logger = new Logger(ProvisioningService.name);

    constructor(
        @Inject('SCHEMA_CREATOR_SERVICE')
        private readonly schemaCreator: SchemaCreatorService,
        @Inject('DATA_SEEDER_SERVICE')
        private readonly dataSeeder: DataSeederService,
        @Inject('TRAEFIK_ROUTER_SERVICE')
        private readonly traefikRouter: TraefikRouterService,
        @Inject(EventEmitter2)
        private readonly eventEmitter: EventEmitter2,
        private readonly encryptionService: EncryptionService,
        @Optional() private readonly pool: Pool = new Pool({ connectionString: process.env.DATABASE_URL }),
    ) { }

    /**
     * Main provisioning flow - creates tenant with full isolation
     * @param dto - Tenant creation data
     * @returns Provisioning result with timing metrics
     */
    async provisionTenant(dto: CreateTenantDto) {
        const startTime = Date.now();
        const { subdomain, ownerEmail, blueprintId = 'standard' } = dto;

        this.logger.log(`🚀 Starting provisioning for: ${subdomain}`);

        try {
            // PHASE 1: Schema Creation (S2 Isolation)
            const schemaPhaseStart = Date.now();
            const schemaName = await this.schemaCreator.createSchema(subdomain);
            const schemaPhaseDuration = Date.now() - schemaPhaseStart;
            this.logger.debug(`Phase 1 (Schema): ${schemaPhaseDuration}ms`);

            // PHASE 2: Data Seeding
            const seedPhaseStart = Date.now();
            await this.dataSeeder.seedData(subdomain, blueprintId);
            const seedPhaseDuration = Date.now() - seedPhaseStart;
            this.logger.debug(`Phase 2 (Seeding): ${seedPhaseDuration}ms`);

            // PHASE 3: Traefik Routing
            const routePhaseStart = Date.now();
            await this.traefikRouter.createRoute(subdomain);
            const routePhaseDuration = Date.now() - routePhaseStart;
            this.logger.debug(`Phase 3 (Routing): ${routePhaseDuration}ms`);

            // PHASE 4: Register in Public Tenants Table
            const registerPhaseStart = Date.now();
            await this.registerTenant(subdomain, ownerEmail, dto);
            const registerPhaseDuration = Date.now() - registerPhaseStart;
            this.logger.debug(`Phase 4 (Registration): ${registerPhaseDuration}ms`);

            // Calculate total duration
            const totalDuration = Date.now() - startTime;

            // Emit success event
            this.eventEmitter.emit(
                'tenant.provisioned',
                new TenantProvisionedEvent({
                    subdomain,
                    ownerEmail,
                    blueprintId,
                    schemaName,
                    duration: totalDuration,
                    phases: {
                        schema: schemaPhaseDuration,
                        seed: seedPhaseDuration,
                        route: routePhaseDuration,
                        register: registerPhaseDuration,
                    },
                })
            );

            // Performance validation (Pillar 3)
            if (totalDuration > 55000) {
                this.logger.warn(`⚠️ PROVISIONING EXCEEDED 55s THRESHOLD: ${totalDuration}ms`);
            } else {
                this.logger.log(`✅ PROVISIONING COMPLETED in ${totalDuration}ms (< 55s ✅)`);
            }

            return {
                success: true,
                subdomain,
                schemaName,
                duration: totalDuration,
                phases: {
                    schema: schemaPhaseDuration,
                    seed: seedPhaseDuration,
                    route: routePhaseDuration,
                    register: registerPhaseDuration,
                },
                northStar: totalDuration < 55000 ? '✅ MET' : '❌ MISSED',
            };
        } catch (error: any) {
            this.logger.error(`Provisioning failed for ${subdomain}: ${error.message}`);

            // Emit failure event
            this.eventEmitter.emit(
                'tenant.failed',
                new TenantFailedEvent({
                    subdomain,
                    error: error.message,
                    duration: Date.now() - startTime,
                })
            );

            throw new InternalServerErrorException(
                `Provisioning failed: ${error.message}`
            );
        }
    }

    /**
     * Registers tenant in public.tenants table
     */
    private async registerTenant(
        subdomain: string,
        ownerEmail: string,
        dto: CreateTenantDto,
    ): Promise<void> {
        // Use injected pool
        try {
            // 🔴 ARCH-S7: Encrypt PII before storage
            const encryptedEmail = await this.encryptionService.encrypt(ownerEmail);

            await this.pool.query(
                `INSERT INTO public.tenants (name, subdomain, owner_email, plan_id, status)
         VALUES ($1, $2, $3, $4, 'active')
         ON CONFLICT (subdomain) DO UPDATE SET updated_at = CURRENT_TIMESTAMP`,
                [dto.storeName || subdomain, subdomain, encryptedEmail, dto.planId || 'basic']
            );

            // Log audit
            await this.pool.query(
                `INSERT INTO public.audit_logs (user_id, action, tenant_id, status)
         VALUES ('system', 'TENANT_REGISTERED', $1, 'success')`,
                [subdomain]
            );
        } catch (error) {
            throw error;
        }
    }

    /**
     * Validates subdomain format and availability
     */
    async validateSubdomain(subdomain: string): Promise<boolean> {
        // Format validation
        const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
        if (!subdomainRegex.test(subdomain)) {
            throw new BadRequestException(
                'Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.'
            );
        }

        // Availability check
        const result = await this.pool.query(
            `SELECT id FROM public.tenants WHERE subdomain = $1`,
            [subdomain]
        );

        if (result.rows.length > 0) {
            throw new BadRequestException(`Subdomain "${subdomain}" is already taken`);
        }

        return true;
    }
}
