import { Module } from '@nestjs/common';
import { ProvisioningService } from './provisioning.service';
import { ProvisioningController } from './provisioning.controller';
import { SchemaCreatorService, DataSeederService, TraefikRouterService } from '@apex/provisioning';

@Module({
    imports: [],
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
        ProvisioningService,
        SchemaCreatorService,
        DataSeederService,
        TraefikRouterService,
    ],
    exports: ['PROVISIONING_SERVICE', 'SCHEMA_CREATOR_SERVICE', 'DATA_SEEDER_SERVICE', 'TRAEFIK_ROUTER_SERVICE', ProvisioningService],
})
export class ProvisioningModule { }
