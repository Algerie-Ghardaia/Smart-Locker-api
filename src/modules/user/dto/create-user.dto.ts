// =============================================================================
// src/modules/user/dto/create-user.dto.ts
// DTO CRÉATION UTILISATEUR
// =============================================================================

import { IsString, IsEmail, IsNotEmpty, MinLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '../../../common/types/role.enum';

export class CreateUserDto {
  @ApiProperty({ example: 'admin', description: 'Nom d\'utilisateur unique' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'admin@smartlocker.com', description: 'Adresse email valide' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'admin123456', description: 'Mot de passe (min 6 caractères)' })
  @IsString()
  @MinLength(6)
  @IsNotEmpty()
  password: string;

  @ApiPropertyOptional({ 
    enum: Role, 
    example: Role.ADMIN,
    description: 'Rôle de l\'utilisateur' 
  })
  @IsEnum(Role)
  @IsOptional()
  role?: Role;

  @ApiPropertyOptional({ example: '+33612345678', description: 'Numéro de téléphone' })
  @IsString()
  @IsOptional()
  phone?: string;
}