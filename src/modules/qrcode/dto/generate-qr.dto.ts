// =============================================================================
// src/modules/qrcode/dto/generate-qr.dto.ts
// DTO — Génération de QR codes
// =============================================================================

import { IsString, IsNotEmpty, IsOptional, IsNumber, IsHexColor, Min, Max, IsIn, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export enum QRCodeFormat {
  PNG = 'png',
  SVG = 'svg',
  BASE64 = 'base64',
  DATA_URL = 'data_url',
}

export enum QRCodeTemplate {
  SIMPLE = 'simple',
  PICKUP = 'pickup',
  EMAIL = 'email',
  SMS = 'sms',
}

export class GenerateQRDto {
  @ApiProperty({ 
    example: '123456', 
    description: 'Contenu du QR code (code de retrait, URL, etc.)' 
  })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ 
    enum: QRCodeFormat, 
    default: QRCodeFormat.DATA_URL,
    description: 'Format de sortie' 
  })
  @IsOptional()
  @IsIn(Object.values(QRCodeFormat))
  format?: QRCodeFormat = QRCodeFormat.DATA_URL;

  @ApiPropertyOptional({ 
    example: 400, 
    description: 'Largeur en pixels',
    minimum: 100,
    maximum: 1000 
  })
  @IsNumber()
  @IsOptional()
  @Min(100)
  @Max(1000)
  @Transform(({ value }) => parseInt(value) || value)
  width?: number = 400;

  @ApiPropertyOptional({ 
    example: 2, 
    description: 'Marge (nombre de modules)',
    minimum: 0,
    maximum: 10 
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  @Transform(({ value }) => parseInt(value) || value)
  margin?: number = 2;

  @ApiPropertyOptional({ 
    example: '#000000', 
    description: 'Couleur des modules (foreground)' 
  })
  @IsHexColor()
  @IsOptional()
  colorDark?: string = '#000000';

  @ApiPropertyOptional({ 
    example: '#FFFFFF', 
    description: 'Couleur de fond' 
  })
  @IsHexColor()
  @IsOptional()
  colorLight?: string = '#FFFFFF';

  @ApiPropertyOptional({ 
    enum: QRCodeTemplate, 
    default: QRCodeTemplate.SIMPLE,
    description: 'Template HTML à utiliser pour l\'affichage' 
  })
  @IsOptional()
  @IsIn(Object.values(QRCodeTemplate))
  template?: QRCodeTemplate = QRCodeTemplate.SIMPLE;

  @ApiPropertyOptional({ 
    example: 'Client Test', 
    description: 'Nom du destinataire (pour templates)' 
  })
  @IsString()
  @IsOptional()
  recipientName?: string;

  @ApiPropertyOptional({ 
    example: 'H03', 
    description: 'Numéro de casier (pour templates)' 
  })
  @IsString()
  @IsOptional()
  shelfNo?: string;

  @ApiPropertyOptional({ 
    example: '2026-04-27T18:00:00.000Z', 
    description: 'Date d\'expiration (pour templates)' 
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiPropertyOptional({ 
    example: 'Centre Commercial Bab Ezzouar', 
    description: 'Emplacement du casier (pour templates)' 
  })
  @IsString()
  @IsOptional()
  lockerLocation?: string;

  @ApiPropertyOptional({ 
    example: 'SmartLocker', 
    description: 'Nom de l\'entreprise (pour templates)' 
  })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ 
    example: '+213 23 00 00 00', 
    description: 'Téléphone support (pour templates)' 
  })
  @IsString()
  @IsOptional()
  supportPhone?: string;

  @ApiPropertyOptional({ 
    example: 'support@smartlocker.dz', 
    description: 'Email support (pour templates)' 
  })
  @IsString()
  @IsOptional()
  supportEmail?: string;
}