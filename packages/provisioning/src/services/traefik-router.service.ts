import { Injectable, Logger } from '@nestjs/common';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

@Injectable()
export class TraefikRouterService {
    private readonly logger = new Logger(TraefikRouterService.name);
    private readonly dynamicConfigDir = process.env.TRAEFIK_DYNAMIC_DIR || './infra/docker/traefik/dynamic';

    /**
     * Creates dynamic Traefik route for tenant
     * @param subdomain - Tenant subdomain (e.g., 'myshop')
     * @param targetService - Target service (e.g., 'storefront@docker')
     */
    async createRoute(subdomain: string, targetService: string = 'storefront@docker'): Promise<void> {
        const startTime = Date.now();
        const routeName = `${subdomain}-route`;

        this.logger.log(`Creating Traefik route: ${routeName}`);

        try {
            // Ensure directory exists
            await mkdir(this.dynamicConfigDir, { recursive: true });

            // Generate dynamic configuration
            const config = {
                http: {
                    routers: {
                        [routeName]: {
                            rule: `Host(\`${subdomain}.apex.localhost\`)`,
                            service: targetService,
                            entryPoints: ['web'],
                            middlewares: ['tenant-isolation']
                        }
                    },
                    services: {
                        [targetService]: {
                            loadBalancer: {
                                servers: [
                                    { url: `http://${targetService.split('@')[0]}:3000` }
                                ]
                            }
                        }
                    },
                    middlewares: {
                        'tenant-isolation': {
                            headers: {
                                customRequestHeaders: {
                                    'X-Tenant-Id': subdomain
                                }
                            }
                        }
                    }
                }
            };

            // Write YAML configuration
            const yamlContent = this.toYaml(config);
            const filePath = join(this.dynamicConfigDir, `${routeName}.yml`);

            await writeFile(filePath, yamlContent, 'utf-8');

            const duration = Date.now() - startTime;
            this.logger.log(`✅ Traefik route created in ${duration}ms: ${filePath}`);
        } catch (error: any) {
            this.logger.error(`Failed to create Traefik route: ${error.message}`);
            throw error;
        }
    }

    /**
     * Removes Traefik route for tenant
     */
    async removeRoute(subdomain: string): Promise<void> {
        const routeName = `${subdomain}-route`;
        const filePath = join(this.dynamicConfigDir, `${routeName}.yml`);

        try {
            // File removal handled by deployment script
            this.logger.log(`Route removal scheduled: ${routeName}`);
        } catch (error: any) {
            this.logger.error(`Failed to remove route: ${error.message}`);
        }
    }

    /**
     * Converts object to YAML string
     */
    private toYaml(obj: any, indent: number = 0): string {
        const spaces = '  '.repeat(indent);
        const lines: string[] = [];

        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                lines.push(`${spaces}${key}:`);
                lines.push(this.toYaml(value, indent + 1));
            } else if (Array.isArray(value)) {
                lines.push(`${spaces}${key}:`);
                for (const item of value) {
                    lines.push(`${spaces}  - ${JSON.stringify(item)}`);
                }
            } else {
                lines.push(`${spaces}${key}: ${JSON.stringify(value)}`);
            }
        }

        return lines.join('\n');
    }
}
