import { Test, TestingModule } from '@nestjs/testing';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';

describe('TenantsController', () => {
    let controller: TenantsController;
    let service: TenantsService;

    const mockTenantsService = {
        findAll: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue({ id: '1', subdomain: 'test' }),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TenantsController],
            providers: [
                {
                    provide: TenantsService,
                    useValue: mockTenantsService,
                },
            ],
        }).compile();

        controller = module.get<TenantsController>(TenantsController);
        service = module.get<TenantsService>(TenantsService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should return all tenants', async () => {
        const query = { limit: 10, page: 1 };
        const result = await controller.findAll(query);
        expect(result).toEqual([]);
        expect(service.findAll).toHaveBeenCalledWith(query);
    });

    it('should return one tenant', async () => {
        const result = await controller.findOne('1');
        expect(result).toEqual({ id: '1', subdomain: 'test' });
        expect(service.findOne).toHaveBeenCalledWith('1');
    });
});
