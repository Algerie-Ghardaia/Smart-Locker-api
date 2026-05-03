// =============================================================================
// src/modules/billing/dto/create-invoice.dto.ts
// DTO CREATE INVOICE — Validation des données de création
// =============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsDateString,
  MaxLength,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  InvoiceType,
  BillingPeriod,
} from '../enums/invoice-status.enum';

// -----------------------------------------------------------------------------
// DTO Item
// -----------------------------------------------------------------------------

export class CreateInvoiceItemDto {
  @ApiProperty({
    example: 'Abonnement SmartLocker — Avril 2025',
    description: 'Description de l\'article',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  description: string;

  @ApiProperty({ example: 1, description: 'Quantité', minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({
    example: 49.99,
    description: 'Prix unitaire HT en euros',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional({
    example: 'RES-20260423-001',
    description: 'Référence optionnelle (réservation, colis...)',
  })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({
    description: 'Métadonnées additionnelles',
  })
  @IsOptional()
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// DTO principal
// -----------------------------------------------------------------------------

export class CreateInvoiceDto {
  @ApiProperty({
    example: 'be6c0f5e-e4e2-4d9a-8435-24c58f78e894',
    description: 'ID de l\'utilisateur (UUID PostgreSQL)',
  })
  @IsUUID('4', { message: 'ID utilisateur invalide' })
  @IsNotEmpty({ message: 'L\'ID utilisateur est requis' })
  userId: string;

  @ApiProperty({
    enum: InvoiceType,
    example: InvoiceType.SUBSCRIPTION,
    description: 'Type de facture',
  })
  @IsEnum(InvoiceType, { message: 'Type de facture invalide' })
  @IsNotEmpty()
  type: InvoiceType;

  @ApiProperty({
    enum: BillingPeriod,
    example: BillingPeriod.MONTHLY,
    description: 'Période de facturation',
  })
  @IsEnum(BillingPeriod, { message: 'Période de facturation invalide' })
  @IsNotEmpty()
  period: BillingPeriod;

  @ApiProperty({
    type: [CreateInvoiceItemDto],
    description: 'Lignes de la facture',
    example: [
      {
        description: 'Forfait SmartLocker Pro — Avril 2025',
        quantity: 1,
        unitPrice: 299.99,
        reference: 'SUB-PRO-001',
      },
      {
        description: 'Casier supplémentaire — Avril 2025',
        quantity: 2,
        unitPrice: 49.99,
      },
    ],
  })
  @IsArray()
  @ArrayMinSize(1, { message: 'Au moins une ligne de facture est requise' })
  @ValidateNested({ each: true })
  @Type(() => CreateInvoiceItemDto)
  items: CreateInvoiceItemDto[];

  @ApiPropertyOptional({
    example: 20,
    description: 'Taux de TVA en pourcentage (défaut: 20%)',
    minimum: 0,
    maximum: 100,
    default: 20,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  taxRate?: number = 20;

  @ApiPropertyOptional({
    example: 'EUR',
    description: 'Code devise ISO 4217',
    default: 'EUR',
    maxLength: 3,
  })
  @IsString()
  @MaxLength(3)
  @IsOptional()
  currency?: string = 'EUR';

  @ApiPropertyOptional({
    example: '2025-05-15',
    description: 'Date d\'échéance (défaut: 30 jours)',
  })
  @IsDateString()
  @IsOptional()
  dueAt?: string;

  @ApiPropertyOptional({
    example: 'Client VIP — Tarif préférentiel',
    description: 'Notes internes (visibles uniquement par les admins)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  internalNotes?: string;

  @ApiPropertyOptional({
    example: 'Paiement par virement SVP',
    description: 'Notes visibles sur la facture PDF',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  clientNotes?: string;
}