// =============================================================================
// src/modules/reservation/dto/update-reservation.dto.ts
// DTO — Mise à jour d'une réservation
// =============================================================================

import { IsOptional, IsDateString, IsString, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../types/reservation-status.enum';

export class UpdateReservationDto {
  @ApiPropertyOptional({
    example: '2026-05-01T12:00:00.000Z',
    description: 'Nouvelle date de début',
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-05-01T20:00:00.000Z',
    description: 'Nouvelle date de fin',
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({
    example: 'Colis fragile ajouté',
    description: 'Notes mises à jour',
  })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiPropertyOptional({
    enum: ReservationStatus,
    example: ReservationStatus.CANCELLED,
    description: 'Nouveau statut',
  })
  @IsEnum(ReservationStatus)
  @IsOptional()
  status?: ReservationStatus;
}