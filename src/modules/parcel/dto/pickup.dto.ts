// =============================================================================
// src/modules/parcel/dto/pickup.dto.ts
// DTO PICKUP — Retrait client (public)
// =============================================================================

import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PickupDto {
  @ApiProperty({
    example: '123456',
    description: 'Code de retrait à 6 chiffres (scanné ou saisi manuellement)',
  })
  @IsString()
  @IsNotEmpty({ message: 'Le code de retrait est requis' })
  code: string;

  @ApiPropertyOptional({
    description: 'ID du casier (optionnel, accélère la recherche)',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsString()
  @IsOptional()
  lockerId?: string;

  @ApiPropertyOptional({
    enum: ['qrcode', 'manual'],
    description: 'Méthode de retrait (scan QR ou saisie manuelle)',
    default: 'qrcode',
  })
  @IsOptional()
  @IsIn(['qrcode', 'manual'], {
    message: 'La méthode doit être "qrcode" ou "manual"',
  })
  method?: 'qrcode' | 'manual' = 'qrcode';
}