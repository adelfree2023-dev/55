import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { ZodSchema, z } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
    constructor(private schema: ZodSchema) { }

    transform(value: unknown, metadata: ArgumentMetadata) {
        if (metadata.type !== 'body') return value;
        try {
            return this.schema.parse(value);
        } catch (error) {
            if (error instanceof z.ZodError) {
                // Format errors to be more readable
                throw new BadRequestException({
                    message: 'Validation failed',
                    errors: error.flatten().fieldErrors,
                });
            }
            throw new BadRequestException('Validation failed');
        }
    }
}
