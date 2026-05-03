// =============================================================================
// src/modules/parcel/dto/deposit.dto.ts
// DTO DEPOSIT — Validation complète des données de dépôt
// =============================================================================
//
// Correction (2026-04-28) :
//   - Ajout du champ `notes` avec persistance garantie
//   - Documentation enrichie pour chaque champ
// =============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsEmail,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompartmentSize } from '../../../common/types/compartment-size.enum';

export class DepositDto {
  @ApiProperty({
    example: 'SL-20260428-001',
    description: 'Numéro de suivi unique du colis (généré par /generate-tracking)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le numéro de suivi est requis' })
  trackingNo: string;

  @ApiPropertyOptional({
    example: '+33612345678',
    description: 'Téléphone du destinataire pour envoi SMS du code de retrait',
  })
  @IsString()
  @IsOptional()
  recipientPhone?: string;

  @ApiPropertyOptional({
    example: 'Jean Dupont',
    description: 'Nom complet du destinataire',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  recipientName?: string;

  @ApiPropertyOptional({
    example: 'client@example.com',
    description: 'Email du destinataire (notifications optionnelles)',
  })
  @IsEmail({}, { message: "Format d'email invalide" })
  @IsOptional()
  recipientEmail?: string;

  @ApiProperty({
    example: 'be6c0f5e-e4e2-4d9a-8435-24c58f78e894',
    description: 'UUID du casier cible pour le dépôt',
  })
  @IsUUID('4', { message: 'ID de casier invalide (UUID v4 requis)' })
  lockerId: string;

  @ApiPropertyOptional({
    enum: CompartmentSize,
    example: CompartmentSize.M,
    default: CompartmentSize.M,
    description: 'Taille de case souhaitée (S, M, L, XL)',
  })
  @IsEnum(CompartmentSize, { message: 'Taille invalide (valeurs acceptées : S, M, L, XL)' })
  @IsOptional()
  size?: CompartmentSize = CompartmentSize.M;

  @ApiPropertyOptional({
    example: 'https://photo.colis.com/123.jpg',
    description: 'URL de la photo du colis prise au dépôt',
  })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({
    example: 'Colis fragile — manipuler avec précaution',
    description: 'Notes libres sur le colis (instructions particulières)',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Les notes ne peuvent pas dépasser 1000 caractères' })
  notes?: string;
}