// =============================================================================
// src/modules/billing/dto/invoice-filter.dto.ts
// DTO FILTER — Filtres de recherche de factures
// =============================================================================

import { IsString, IsOptional, IsEnum, IsDateString, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  InvoiceStatus,
  InvoiceType,
  BillingPeriod,
} from '../enums/invoice-status.enum';

export class InvoiceFilterDto {
  @ApiPropertyOptional({
    description: 'Filtrer par ID utilisateur (UUID)',
  })
  @IsString()
  @IsOptional()
  userId?: string;

  @ApiPropertyOptional({
    enum: InvoiceStatus,
    description: 'Filtrer par statut',
  })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    enum: InvoiceType,
    description: 'Filtrer par type de facture',
  })
  @IsEnum(InvoiceType)
  @IsOptional()
  type?: InvoiceType;

  @ApiPropertyOptional({
    enum: BillingPeriod,
    description: 'Filtrer par période',
  })
  @IsEnum(BillingPeriod)
  @IsOptional()
  period?: BillingPeriod;

  @ApiPropertyOptional({
    example: '2025-04-01',
    description: 'Date de début (format ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  dateFrom?: string;

  @ApiPropertyOptional({
    example: '2025-04-30',
    description: 'Date de fin (format ISO 8601)',
  })
  @IsDateString()
  @IsOptional()
  dateTo?: string;

  @ApiPropertyOptional({
    example: 'FACT-2025-04',
    description: 'Recherche par numéro de facture ou description',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Numéro de page',
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Nombre d\'éléments par page',
    default: 20,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  @IsOptional()
  limit?: number = 20;

  @ApiPropertyOptional({
    example: 'issuedAt',
    description: 'Champ de tri',
    default: 'createdAt',
  })
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @ApiPropertyOptional({
    example: 'desc',
    description: 'Ordre de tri',
    default: 'desc',
    enum: ['asc', 'desc'],
  })
  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';
}