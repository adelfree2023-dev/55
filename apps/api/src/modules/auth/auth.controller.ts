import { Controller, Post, Body, UnauthorizedException, BadRequestException, Request, HttpException, HttpStatus } from '@nestjs/common';
import { TenantsService } from '../tenants/tenants.service';
import { RedisService } from '@apex/redis';
import { LoginSchema } from '@apex/validators';

@Controller('auth')
export class AuthController {
    constructor(
        private readonly tenantsService: TenantsService,
        private readonly redisService: RedisService,
    ) { }

    @Post('login')
    async login(@Body() body: any, @Request() req: any) {
        // 🛡️ [Security] Strict Rate Limiting (Redis-based)
        const ip = req.socket.remoteAddress || 'unknown';
        const rateLimitKey = `auth_limit:${ip}`;

        try {
            const currentRequests = await this.redisService.incr(rateLimitKey);

            if (currentRequests === 1) {
                await this.redisService.expire(rateLimitKey, 60); // 1 minute window
            }

            if (currentRequests > 5) { // Strict: max 5 attempts per minute
                throw new HttpException('Too many login attempts. Please try again in 1 minute.', HttpStatus.TOO_MANY_REQUESTS);
            }
        } catch (error: any) {
            if (error instanceof HttpException) throw error;
            // If Redis fails, we should handle it (here we log and continue for availability, or block for security)
            console.error('Rate limit redis check failed:', error.message);
        }

        // Validate Input
        const result = LoginSchema.safeParse(body);
        if (!result.success) {
            throw new BadRequestException(result.error.errors);
        }

        const { subdomain, password } = result.data;

        // Verify Password
        const isValid = await this.tenantsService.verifyAdminPassword(subdomain, password);

        if (!isValid) {
            throw new UnauthorizedException('Invalid subdomain or password');
        }

        // 🔓 Phase 9: Successful authentication
        return {
            success: true,
            message: 'Authenticated successfully',
            user: { subdomain },
            // Placeholder: Admin token for dashboard access
            token: `apex_admin_${Buffer.from(subdomain).toString('hex')}_${Date.now()}`
        };
    }
}
