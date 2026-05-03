// =============================================================================
// src/modules/auth/dto/refresh.dto.ts
// DTO REFRESH — Validation du refresh token
// =============================================================================

import { IsString, IsNotEmpty, IsJWT } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token JWT obtenu lors du login',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le refresh token est requis' })
  @IsJWT({ message: 'Format de refresh token invalide' })
  refreshToken: string;
}
