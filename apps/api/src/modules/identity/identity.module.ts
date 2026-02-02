import { Module, Global } from '@nestjs/common';
import { IdentityService } from './identity.service';
import { IdentityController } from './identity.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Global()
@Module({
    imports: [TenantsModule],
    providers: [IdentityService],
    controllers: [IdentityController],
    exports: [IdentityService],
})
export class IdentityModule { }
