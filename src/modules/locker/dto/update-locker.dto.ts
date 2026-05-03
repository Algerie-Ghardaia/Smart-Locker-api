// =============================================================================
// src/modules/locker/dto/update-locker.dto.ts
// DTO MISE À JOUR CASIER — Tous les champs modifiables (REFONDU)
// =============================================================================
//
// PATCH /lockers/:id — Mise à jour partielle.
// Seuls les champs fournis sont modifiés, les autres restent inchangés.
//
// Correction (2026-04-28) :
//   - Messages d'erreur en français
//   - Contraintes min/max sur les coordonnées GPS
//   - Validation du code postal et wilaya
//   - Documentation enrichie
// =============================================================================

import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsIP,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateLockerDto {
  // ---------------------------------------------------------------------------
  // Identification
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 'SL-16-ALG-BABEZ-001',
    description: 'Nom unique du casier',
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsOptional()
  @MaxLength(50)
  name?: string;

  // ---------------------------------------------------------------------------
  // Localisation postale
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 'Centre Commercial Bab Ezzouar, Niveau 1 — Entrée Nord',
    description: 'Description textuelle de la localisation',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  location?: string;

  @ApiPropertyOptional({
    example: 'Cité 5 Juillet, Bâtiment B, N°12',
    description: 'Adresse postale complète',
  })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({
    example: '16000',
    description: 'Code postal (5 chiffres)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{5}$/, { message: 'Le code postal doit contenir 5 chiffres' })
  postalCode?: string;

  @ApiPropertyOptional({
    example: 'Alger',
    description: 'Ville',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional({
    example: '16',
    description: 'Code wilaya (1 à 2 chiffres)',
  })
  @IsString()
  @IsOptional()
  @Matches(/^\d{1,2}$/, {
    message: 'Le code wilaya doit contenir 1 ou 2 chiffres',
  })
  wilayaCode?: string;

  @ApiPropertyOptional({
    example: 'Alger',
    description: 'Nom de la wilaya',
  })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  wilayaName?: string;

  // ---------------------------------------------------------------------------
  // Coordonnées GPS (CRITIQUE — ajouté le 2026-04-27)
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 36.717,
    description:
      'Latitude GPS en degrés décimaux (WGS84). Plage : -90 à 90. ' +
      'Exemple pour Alger : 36.717',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber({}, { message: 'La latitude doit être un nombre décimal' })
  @IsOptional()
  @Min(-90, { message: 'La latitude doit être >= -90' })
  @Max(90, { message: 'La latitude doit être <= 90' })
  latitude?: number;

  @ApiPropertyOptional({
    example: 3.183,
    description:
      'Longitude GPS en degrés décimaux (WGS84). Plage : -180 à 180. ' +
      'Exemple pour Alger : 3.183',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber({}, { message: 'La longitude doit être un nombre décimal' })
  @IsOptional()
  @Min(-180, { message: 'La longitude doit être >= -180' })
  @Max(180, { message: 'La longitude doit être <= 180' })
  longitude?: number;

  // ---------------------------------------------------------------------------
  // Note
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 4.5,
    description: 'Note du casier sur 5',
    minimum: 0,
    maximum: 5,
  })
  @IsNumber({}, { message: 'La note doit être un nombre entre 0 et 5' })
  @IsOptional()
  @Min(0)
  @Max(5)
  rating?: number;

  // ---------------------------------------------------------------------------
  // Champs techniques
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 'Déplacé au niveau 1 suite à travaux',
    description: 'Description technique ou note interne',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: '10.16.1.102',
    description: 'Adresse IP du casier',
  })
  @IsIP('4', { message: "Format d'adresse IP invalide" })
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({
    example: 'v2.2.0',
    description: 'Version du firmware',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  firmwareVersion?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'Activer ou désactiver le casier. ' +
      'Les casiers inactifs ne sont pas affichés sur la carte.',
  })
  @IsBoolean({ message: 'isActive doit être un booléen' })
  @IsOptional()
  isActive?: boolean;
}
