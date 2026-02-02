import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { ProvisioningModule } from '../provisioning/provisioning.module';

@Module({
    imports: [ProvisioningModule],
    controllers: [TenantsController],
    providers: [TenantsService],
    exports: [TenantsService],
})
export class TenantsModule { }
