// =============================================================================
// src/modules/locker/dto/create-locker.dto.ts
// DTO CRÉATION CASIER — Complet avec localisation et note (REFONDU)
// =============================================================================
//
// Validation complète des données de création d'un casier.
// Tous les champs sont optionnels sauf le nom.
// Les compartiments peuvent être créés en même temps que le casier.
//
// Correction (2026-04-28) :
//   - Messages d'erreur en français pour chaque validateur
//   - Documentation enrichie avec exemples réels
//   - Contraintes min/max sur les coordonnées GPS
//   - Validation du format wilaya (2 chiffres)
// =============================================================================

import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsNumber,
  IsIP,
  Min,
  Max,
  IsEnum,
  ArrayMinSize,
  Matches,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CompartmentSize } from '../../../common/types/compartment-size.enum';

// =============================================================================
// DTO pour un compartiment individuel lors de la création
// =============================================================================

export class CreateCompartmentDto {
  @ApiProperty({
    example: 'H01',
    description: 'Identifiant de la case (ex: H01, B03)',
  })
  @IsString({ message: "L'identifiant de la case doit être une chaîne" })
  @IsNotEmpty({ message: "L'identifiant de la case est requis" })
  shelfNo: string;

  @ApiProperty({
    enum: CompartmentSize,
    example: CompartmentSize.M,
    description: 'Taille du compartiment (S, M, L, XL)',
  })
  @IsEnum(CompartmentSize, {
    message: 'Taille invalide (valeurs acceptées : S, M, L, XL)',
  })
  size: CompartmentSize;

  @ApiProperty({
    example: 1,
    description: 'Numéro du board électronique',
  })
  @IsNumber({}, { message: 'Le numéro de board doit être un nombre' })
  @Min(0, { message: 'Le numéro de board doit être positif ou zéro' })
  boardNo: number;

  @ApiProperty({
    example: 1,
    description: 'Numéro du verrou sur le board',
  })
  @IsNumber({}, { message: 'Le numéro de verrou doit être un nombre' })
  @Min(0, { message: 'Le numéro de verrou doit être positif ou zéro' })
  lockNo: number;
}

// =============================================================================
// DTO principal de création de casier
// =============================================================================

export class CreateLockerDto {
  // ---------------------------------------------------------------------------
  // Identification
  // ---------------------------------------------------------------------------

  @ApiProperty({
    example: 'SL-16-ALG-BABEZ-001',
    description:
      'Nom unique du casier. Convention : SL-{wilaya}-{ville}-{quartier}-{numéro}',
  })
  @IsString({ message: 'Le nom doit être une chaîne de caractères' })
  @IsNotEmpty({ message: 'Le nom du casier est requis' })
  @MaxLength(50, { message: 'Le nom ne peut pas dépasser 50 caractères' })
  name: string;

  // ---------------------------------------------------------------------------
  // Localisation postale
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 'Centre Commercial Bab Ezzouar, Niveau 0 — Entrée principale',
    description: 'Description textuelle de la localisation',
  })
  @IsString({ message: 'La localisation doit être une chaîne' })
  @IsOptional()
  @MaxLength(500, {
    message: 'La localisation ne peut pas dépasser 500 caractères',
  })
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
    description: 'Code postal',
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
    description: 'Code wilaya (2 chiffres)',
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
  // Coordonnées GPS
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 36.717,
    description: 'Latitude GPS en degrés décimaux (WGS84). Plage : -90 à 90.',
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
      'Longitude GPS en degrés décimaux (WGS84). Plage : -180 à 180.',
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
    description: 'Note initiale sur 5',
    minimum: 0,
    maximum: 5,
  })
  @IsNumber({}, { message: 'La note doit être un nombre' })
  @IsOptional()
  @Min(0, { message: 'La note doit être >= 0' })
  @Max(5, { message: 'La note doit être <= 5' })
  rating?: number;

  // ---------------------------------------------------------------------------
  // Champs techniques
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    example: 'Casier consigne colis — modèle 2026',
    description: 'Description technique ou note interne',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  description?: string;

  @ApiPropertyOptional({
    example: '10.16.1.101',
    description: 'Adresse IP du casier sur le réseau local',
  })
  @IsIP('4', { message: "Format d'adresse IP invalide" })
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({
    example: 'SL-DZ-2026-00001',
    description: 'Numéro de série constructeur',
  })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  serialNumber?: string;

  @ApiPropertyOptional({
    example: 'v2.1.0',
    description: 'Version du firmware embarqué',
  })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  firmwareVersion?: string;

  @ApiPropertyOptional({
    example: true,
    default: true,
    description: 'Activer le casier (false = désactivé)',
  })
  @IsBoolean({ message: 'isActive doit être un booléen' })
  @IsOptional()
  isActive?: boolean;

  // ---------------------------------------------------------------------------
  // Compartiments
  // ---------------------------------------------------------------------------

  @ApiPropertyOptional({
    type: [CreateCompartmentDto],
    description:
      'Compartiments à créer avec le casier. ' +
      'Au moins un compartiment doit être fourni.',
  })
  @IsArray({ message: 'Les compartiments doivent être un tableau' })
  @IsOptional()
  @Type(() => CreateCompartmentDto)
  @ArrayMinSize(1, { message: 'Au moins un compartiment est requis' })
  compartments?: CreateCompartmentDto[];
}
