// =============================================================================
// src/modules/parcel/dto/generate-tracking.dto.ts
// DTO — Génération de numéro de suivi
// =============================================================================

import { IsString, IsOptional, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GenerateTrackingDto {
  @ApiPropertyOptional({
    description: 'Préfixe personnalisé (2-4 lettres majuscules)',
    example: 'SL',
    default: 'SL',
  })
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{2,4}$/, {
    message: 'Le préfixe doit contenir 2 à 4 lettres majuscules',
  })
  prefix?: string = 'SL';
}
