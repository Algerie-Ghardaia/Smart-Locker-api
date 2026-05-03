// =============================================================================
// src/common/pipes/validation.pipe.ts
// PIPE — Validation des DTOs avec class-validator
// =============================================================================

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class CustomValidationPipe implements PipeTransform<any> {
  async transform(value: any, { metatype }: ArgumentMetadata) {
    // Si pas de type ou type primitif, ne pas valider
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    // Convertir en instance de classe
    const object = plainToInstance(metatype, value);
    
    // Valider
    const errors = await validate(object, {
      whitelist: true,
      forbidNonWhitelisted: true,
      validationError: { target: false },
    });

    if (errors.length > 0) {
      // Formater les erreurs pour une meilleure lisibilité
      const formattedErrors = errors.map(err => ({
        field: err.property,
        value: err.value,
        constraints: err.constraints,
        children: err.children?.length ? err.children : undefined,
      }));

      throw new BadRequestException({
        message: 'Validation failed',
        errors: formattedErrors,
      });
    }

    // Retourner l'objet validé (peut avoir été transformé)
    return object;
  }

  private toValidate(metatype: Function): boolean {
    const types: Function[] = [String, Boolean, Number, Array, Object, Date];
    return !types.includes(metatype);
  }
}