// =============================================================================
// src/modules/auth/dto/login.dto.ts
// DTO LOGIN — Validation des identifiants de connexion
// =============================================================================
//
// Le champ "username" peut recevoir un nom d'utilisateur ou une adresse email.
// Le backend résout l'identifiant dans AuthService.login().
// =============================================================================

import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: "Nom d'utilisateur ou adresse email",
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: "Le nom d'utilisateur est requis" })
  username: string;

  @ApiProperty({
    example: 'admin123456',
    description: 'Mot de passe',
    required: true,
    minLength: 6,
  })
  @IsString()
  @IsNotEmpty({ message: 'Le mot de passe est requis' })
  password: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Se souvenir de moi (session persistante)',
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}
