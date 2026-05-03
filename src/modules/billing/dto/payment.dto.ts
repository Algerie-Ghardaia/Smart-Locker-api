// =============================================================================
// src/modules/billing/dto/payment.dto.ts
// DTO PAYMENT — Enregistrement d'un paiement
// =============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../enums/invoice-status.enum';

export class PaymentDto {
  @ApiProperty({
    example: '67a1b2c3d4e5f6a7b8c9d0e1',
    description: 'ID de la facture (MongoDB ObjectId)',
  })
  @IsString()
  @IsNotEmpty({ message: 'L\'ID de la facture est requis' })
  invoiceId: string;

  @ApiProperty({
    example: 356.97,
    description: 'Montant du paiement (doit correspondre au total TTC)',
    minimum: 0.01,
  })
  @IsNumber()
  @Min(0.01, { message: 'Le montant doit être supérieur à 0' })
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
    description: 'Méthode de paiement utilisée',
  })
  @IsEnum(PaymentMethod, { message: 'Méthode de paiement invalide' })
  paymentMethod: PaymentMethod;

  @ApiPropertyOptional({
    example: 'txn_3N6o2hAqQZP4xKl2',
    description: 'Référence de transaction externe (Stripe, PayPal...)',
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  transactionRef?: string;
}