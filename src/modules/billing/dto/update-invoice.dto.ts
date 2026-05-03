// =============================================================================
// src/modules/billing/dto/update-invoice.dto.ts
// DTO UPDATE INVOICE — Mise à jour partielle
// =============================================================================

import { IsString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../enums/invoice-status.enum';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({
    enum: InvoiceStatus,
    example: InvoiceStatus.PAID,
    description: 'Nouveau statut de la facture',
  })
  @IsEnum(InvoiceStatus, { message: 'Statut de facture invalide' })
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({
    example: 'Paiement reçu le 25/04/2025',
    description: 'Notes internes mises à jour',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  internalNotes?: string;

  @ApiPropertyOptional({
    example: 'Merci pour votre paiement !',
    description: 'Notes client mises à jour',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  clientNotes?: string;
}