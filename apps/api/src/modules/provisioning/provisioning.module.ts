import { Module } from '@nestjs/common';
import { ProvisioningService } from './provisioning.service';
import { ProvisioningController } from './provisioning.controller';
import { SchemaCreatorService, DataSeederService, TraefikRouterService } from '@apex/provisioning';

@Module({
    imports: [],
    controllers: [ProvisioningController],
    providers: [
        ProvisioningService,
        SchemaCreatorService,
        DataSeederService,
        TraefikRouterService,
    ],
    exports: [ProvisioningService],
})
export class ProvisioningModule { }
