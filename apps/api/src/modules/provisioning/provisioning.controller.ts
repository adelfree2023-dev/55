import { Controller, Post, Body, UseInterceptors, Logger, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { ProvisioningService } from './provisioning.service';
import { AuditLoggerInterceptor } from '@apex/security';
import { CreateTenantSchema } from '@apex/validators';

@ApiTags('Provisioning')
@Controller('provisioning')
@UseInterceptors(AuditLoggerInterceptor) // S4 Audit Logging
export class ProvisioningController {
    private readonly logger = new Logger(ProvisioningController.name);

    constructor(private readonly provisioningService: ProvisioningService) { }

    @Post('tenants')
    @ApiOperation({ summary: 'Create new tenant (S2 Isolation + S4 Audit)' })
    @ApiResponse({ status: 201, description: 'Tenant created successfully' })
    @ApiResponse({ status: 400, description: 'Validation failed' })
    async createTenant(
        @Body(new ZodValidationPipe(CreateTenantSchema)) dto: CreateTenantDto,
    ) {
        this.logger.log(`POST /provisioning/tenants - ${dto.subdomain}`);

        return this.provisioningService.provisionTenant(dto);
    }

    @Post('webhooks/stripe')
    @ApiOperation({ summary: 'Handle Stripe webhook (Payment confirmation)' })
    @ApiResponse({ status: 200, description: 'Webhook processed' })
    async handleStripeWebhook(
        @Body() payload: any,
        @Headers('stripe-signature') signature: string,
    ) {
        // TODO: Implement webhook signature verification
        this.logger.log('Stripe webhook received');

        // Process webhook and trigger provisioning
        // return this.webhookProcessor.process(payload, signature);
        return { received: true };
    }
}
