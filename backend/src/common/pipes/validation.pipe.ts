import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class ValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object);

    if (errors.length > 0) {
      const formattedErrors = this.formatErrors(errors);
      throw new BadRequestException({
        message: 'Validation failed',
        error: 'ValidationError',
        details: formattedErrors,
      });
    }

    return value;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype);
  }

  private formatErrors(errors: ValidationError[]): Record<string, string[]> {
    const formatted: Record<string, string[]> = {};

    for (const error of errors) {
      if (error.constraints) {
        formatted[error.property] = Object.values(error.constraints);
      }

      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        const nestedErrors = this.formatErrors(error.children);
        for (const [key, value] of Object.entries(nestedErrors)) {
          formatted[`${error.property}.${key}`] = value;
        }
      }
    }

    return formatted;
  }
}
