// =============================================================================
// src/modules/reservation/dto/create-reservation.dto.ts
// DTO — Création d'une réservation
// =============================================================================

import {
  IsUUID,
  IsEnum,
  IsDateString,
  IsOptional,
  IsString,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompartmentSize } from '../../../common/types/compartment-size.enum';

export class CreateReservationDto {
  @ApiProperty({
    example: 'be6c0f5e-e4e2-4d9a-8435-24c58f78e894',
    description: 'ID du casier',
  })
  @IsUUID('4', { message: 'ID de casier invalide' })
  @IsNotEmpty()
  lockerId: string;

  @ApiProperty({
    enum: CompartmentSize,
    example: CompartmentSize.M,
    description: 'Taille de case souhaitée',
  })
  @IsEnum(CompartmentSize, { message: 'Taille invalide (S, M, L, XL)' })
  requestedSize: CompartmentSize;

  @ApiProperty({
    example: '2026-05-01T10:00:00.000Z',
    description: 'Date et heure de début de réservation (ISO 8601)',
  })
  @IsDateString({}, { message: 'Format de date invalide (ISO 8601 attendu)' })
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    example: '2026-05-01T18:00:00.000Z',
    description: 'Date et heure de fin de réservation (ISO 8601)',
  })
  @IsDateString({}, { message: 'Format de date invalide (ISO 8601 attendu)' })
  @IsNotEmpty()
  endDate: string;

  @ApiPropertyOptional({
    example: 'Livraison prévue du colis Amazon',
    description: 'Notes ou instructions particulières',
  })
  @IsString()
  @IsOptional()
  notes?: string;
}