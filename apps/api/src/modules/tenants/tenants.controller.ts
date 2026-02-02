import { Controller, Get, Query, Param, Logger, Patch, Post, Delete } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { TenantQuerySchema, TenantQuery } from './tenants.service';
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

    @Patch(':id/suspend')
    async suspend(@Param('id') id: string) {
        return this.tenantsService.suspend(id);
    }

    @Patch(':id/activate')
    async activate(@Param('id') id: string) {
        return this.tenantsService.activate(id);
    }

    @Post(':id/impersonate')
    async impersonate(@Param('id') id: string) {
        return this.tenantsService.impersonate(id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete tenant and its schema' })
    async delete(@Param('id') id: string) {
        return this.tenantsService.delete(id);
    }

    @Patch(':id/restore')
    async restore(@Param('id') id: string) {
        return this.tenantsService.restore(id);
    }
}
