import { CreateTenantDto as ICreateTenantDto } from '@apex/validators';

export class CreateTenantDto implements ICreateTenantDto {
    subdomain: string;
    ownerEmail: string;
    storeName: string;
    planId: 'basic' | 'pro' | 'enterprise';
    blueprintId: string;
}
