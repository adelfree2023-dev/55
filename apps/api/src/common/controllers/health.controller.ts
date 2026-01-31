import { Controller, Get } from '@nestjs/common';
import { SkipTenantValidation } from '../decorators/skip-tenant-validation.decorator';

@Controller('health')
export class HealthController {
    @Get()
    @SkipTenantValidation()
    check() {
        return { status: 'ok', timestamp: new Date().toISOString() };
    }
}
