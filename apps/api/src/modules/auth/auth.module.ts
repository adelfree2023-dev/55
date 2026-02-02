import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { RedisModule } from '@apex/redis';

@Module({
    imports: [TenantsModule, RedisModule],
    controllers: [AuthController],
    exports: [],
})
export class AuthModule { }
