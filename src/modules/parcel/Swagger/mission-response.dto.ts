// =============================================================================
// src/modules/parcel/dto/mission-response.dto.ts
// =============================================================================
// DTOs Swagger — Documentation complète de la réponse GET /parcels/missions
//
// Ces classes NE SONT PAS utilisées pour la validation (pas de class-validator).
// Elles servent UNIQUEMENT à décorer Swagger pour générer une documentation
// interactive précise dans Swagger UI.
//
// Convention NestJS :
//   - @ApiProperty      → champ obligatoire
//   - @ApiPropertyOptional → champ nullable (peut être null)
//   - Les exemples reflètent des données de production réelles
// =============================================================================

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// =============================================================================
// MissionItemResponseDto — Structure d'une mission individuelle
// =============================================================================

export class MissionItemResponseDto {
  @ApiProperty({
    description: 'UUID unique du colis dans la base de données',
    example: '6edcb11f-ab6e-4b34-8b9a-e6ac817ba4f6',
    format: 'uuid',
  })
  id: string;

  @ApiProperty({
    description: 'Numéro de suivi unique format SL-YYYYMMDD-XXX',
    example: 'SL-20260427-M05',
    pattern: '^SL-\\d{8}-[A-Z0-9]{3}$',
  })
  trackingNo: string;

  @ApiProperty({
    description: `Statut du colis dans le cycle de vie :
- **pending**   : En attente d'acceptation par un livreur
- **stored**    : Déposé en casier, en attente de retrait client
- **picked_up** : Retiré par le client final
- **expired**   : Délai de retrait dépassé (72h)`,
    enum: ['pending', 'stored', 'picked_up', 'expired'],
    example: 'stored',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Nom complet du destinataire',
    example: 'Nadia Khelil',
    nullable: true,
  })
  recipientName: string | null;

  @ApiPropertyOptional({
    description: 'Téléphone du destinataire au format international',
    example: '+213550000099',
    nullable: true,
  })
  recipientPhone: string | null;

  @ApiPropertyOptional({
    description: 'Nom du casier SmartLocker où le colis est déposé',
    example: 'SL-03-LAG-LOUI-001',
    nullable: true,
  })
  lockerName: string | null;

  @ApiPropertyOptional({
    description: `Coordonnées GPS du casier au format "latitude,longitude".
- null si pas de casier associé (livraison domicile)
- Consommé par la carte Leaflet pour positionner les marqueurs`,
    example: '36.7170000,3.1830000',
    nullable: true,
  })
  lockerLocation: string | null;

  @ApiPropertyOptional({
    description: 'Numéro de la case dans le casier (ex: H01)',
    example: 'H05',
    nullable: true,
  })
  shelfNo: string | null;

  @ApiPropertyOptional({
    description: 'Date de dépôt effectif en casier (ISO 8601)',
    example: '2026-04-26T22:37:49.072Z',
    nullable: true,
  })
  storedAt: string | null;

  @ApiPropertyOptional({
    description: "Date d'expiration du code de retrait (storedAt + 72h)",
    example: '2026-04-29T22:37:49.072Z',
    nullable: true,
  })
  expiresAt: string | null;

  @ApiProperty({
    description: 'Date de création du colis (ISO 8601)',
    example: '2026-04-26T22:30:00.000Z',
  })
  createdAt: string;

  @ApiProperty({
    description: `Indique l'appartenance au livreur connecté :
- **true**  → le livreur est le déposant (apparaît dans myParcels)
- **false** → colis disponible pour acceptation (apparaît dans availableMissions)`,
    example: true,
  })
  isMine: boolean;

  @ApiProperty({
    description: 'Rémunération estimée en euros pour cette livraison',
    example: 4.5,
    minimum: 0,
  })
  earnings: number;
}

// =============================================================================
// MissionsResponseDto — Enveloppe de réponse complète
// =============================================================================

export class MissionsResponseDto {
  @ApiProperty({
    description: `Colis STORED déposés par le livreur connecté, en attente de retrait client.
Inclut les coordonnées GPS complètes du locker.`,
    type: [MissionItemResponseDto],
    isArray: true,
  })
  myParcels: MissionItemResponseDto[];

  @ApiProperty({
    description: `Missions PENDING disponibles à accepter par le livreur.
Le locker n'est pas encore assigné (lockerName et lockerLocation = null).`,
    type: [MissionItemResponseDto],
    isArray: true,
  })
  availableMissions: MissionItemResponseDto[];
}
