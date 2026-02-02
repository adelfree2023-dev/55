import { Controller, Post, Body, Res, Req, UnauthorizedException, Get } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';
import { IdentityService } from './identity.service';
import { LoginSchema } from '@apex/validators';

@Controller('auth')
export class IdentityController {
    constructor(private readonly identityService: IdentityService) { }

    @Post('login')
    async login(
        @Body() body: any,
        @Res({ passthrough: true }) res: FastifyReply,
        @Req() req: FastifyRequest
    ) {
        const result = LoginSchema.safeParse(body);
        if (!result.success) {
            throw new UnauthorizedException('Invalid input format');
        }

        const { email, password, subdomain } = result.data;

        // Resolve tenantId if subdomain is provided
        let tenantId: string | undefined;
        if (subdomain && subdomain !== 'www' && subdomain !== 'admin') {
            // We need a way to get tenantId from subdomain. 
            // TenantsService could help here.
        }

        const { token, user } = await this.identityService.login(email, password, tenantId);

        // Calculate expiry (7 days)
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + 7);

        // Set HttpOnly Cookie
        res.setCookie('apex_session', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            expires: expiry
        });

        return {
            success: true,
            user
        };
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: FastifyReply) {
        res.clearCookie('apex_session', { path: '/' });
        return { success: true };
    }

    @Post('verify')
    async verify(@Body('token') token: string) {
        if (!token) {
            throw new UnauthorizedException('Token is required');
        }
        return this.identityService.verifyEmail(token);
    }

    @Get('me')
    async me(@Req() req: any) {
        // This will be populated by the AuthGuard later
        return req.user || { authenticated: false };
    }
}
