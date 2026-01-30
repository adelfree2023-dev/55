import { Controller, Get, Query, Param, Logger } from '@nestjs/common';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TenantQuerySchema, TenantQuery } from './schemas/tenant-query.schema';
import { TenantsService } from './tenants.service';

@Controller('super-admin/tenants')
export class TenantsController {
    private readonly logger = new Logger(TenantsController.name);

    constructor(private readonly tenantsService: TenantsService) { }

    @Get()
    async findAll(
        @Query(new ZodValidationPipe(TenantQuerySchema)) query: TenantQuery,
    ) {
        this.logger.log(`Fetching tenants with filters: ${JSON.stringify(query)}`);
        return this.tenantsService.findAll(query);
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        return this.tenantsService.findOne(id);
    }
}
