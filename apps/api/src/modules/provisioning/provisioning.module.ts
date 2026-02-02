import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { db } from '@apex/db';
import { EncryptionModule } from '@apex/encryption';
import { ProvisioningController } from './provisioning.controller';
import { ProvisioningService } from './provisioning.service';
import { SchemaCreatorService, DataSeederService, TraefikRouterService } from '@apex/provisioning';

const dbPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    application_name: 'apex-api',
    max: 100, // Remediation: Scale pool for 5000 VUs
    min: 50
});

import { IdentityModule } from '../identity/identity.module';

@Module({
    imports: [EncryptionModule, IdentityModule],
    controllers: [ProvisioningController],
    providers: [
        {
            provide: 'PROVISIONING_SERVICE',
            useClass: ProvisioningService,
        },
        {
            provide: 'SCHEMA_CREATOR_SERVICE',
            useClass: SchemaCreatorService,
        },
        {
            provide: 'DATA_SEEDER_SERVICE',
            useClass: DataSeederService,
        },
        {
            provide: 'TRAEFIK_ROUTER_SERVICE',
            useClass: TraefikRouterService,
        },
        {
            provide: 'BoundPool',
            useValue: dbPool,
        },
        {
            provide: Pool,
            useValue: dbPool,
        },
        {
            provide: 'DATABASE_CONNECTION',
            useValue: db,
        },
        ProvisioningService,
        SchemaCreatorService,
        DataSeederService,
        TraefikRouterService,
    ],
    exports: [
        'PROVISIONING_SERVICE',
        'SCHEMA_CREATOR_SERVICE',
        'DATA_SEEDER_SERVICE',
        'TRAEFIK_ROUTER_SERVICE',
        ProvisioningService,
        'BoundPool',
        Pool,
        'DATABASE_CONNECTION'
    ],
})
export class ProvisioningModule { }
