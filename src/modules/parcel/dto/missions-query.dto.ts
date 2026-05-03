// =============================================================================
// src/modules/parcel/dto/missions-query.dto.ts
// DTO — Validation des paramètres de requête GET /parcels/missions
// =============================================================================
//
// Source unique pour le filtrage des missions.
// Ce type est importé par parcel.types.ts pour GetMissionsOptions.
// =============================================================================

import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Types de filtrage disponibles pour le feed missions livreur.
 *
 * Note importante :
 *   - Les colis PENDING n'ont JAMAIS de locker (par définition).
 *   - Le filtre 'locker' retournera donc toujours availableMissions = [].
 *   - Le filtre 'home' retournera tous les PENDING (pas de locker).
 */
export enum MissionTypeFilter {
  /** Toutes les missions sans filtrage */
  ALL = 'all',
  /** Uniquement les missions avec un casier/locker assigné */
  LOCKER = 'locker',
  /** Uniquement les livraisons à domicile (sans locker) */
  HOME = 'home',
}

export class MissionsQueryDto {
  @ApiPropertyOptional({
    enum: MissionTypeFilter,
    default: MissionTypeFilter.ALL,
    description:
      'Filtre par type de mission.\n' +
      '- **all**    → Toutes les missions (défaut)\n' +
      '- **locker** → Uniquement les missions avec dépôt en casier\n' +
      '- **home**   → Uniquement les missions de livraison à domicile\n\n' +
      'Note : les missions PENDING n\'ont pas de locker, donc "locker" retourne [] pour availableMissions.',
    example: 'locker',
  })
  @IsOptional()
  @IsEnum(MissionTypeFilter, {
    message: 'Le paramètre "type" doit être "all", "locker" ou "home"',
  })
  type?: MissionTypeFilter = MissionTypeFilter.ALL;
}