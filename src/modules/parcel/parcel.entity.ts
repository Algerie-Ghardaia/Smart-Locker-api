// =============================================================================
// src/modules/parcel/parcel.entity.ts
// ENTITÉ COLIS — Modèle de données principal (COMPLET)
// =============================================================================
//
// Correction (2026-04-28) :
//   - Ajout de la colonne `notes` (était dans le DTO mais pas dans l'entité)
//   - Documentation enrichie des statuts et du cycle de vie
//   - Index composites optimisés pour les requêtes fréquentes
// =============================================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Index,
  JoinColumn,
} from 'typeorm';
import { Compartment } from '../compartment/compartment.entity';
import { User } from '../user/user.entity';
import { ParcelStatus } from '../../common/types/parcel-status.enum';

@Entity('parcels')
@Index(['pickupCode'])
@Index(['trackingNo'])
@Index(['status'])
@Index(['depositedBy', 'status']) // Optimisation : missions livreur
export class Parcel {
  // ===========================================================================
  // IDENTIFIANT
  // ===========================================================================

  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ===========================================================================
  // NUMÉRO DE SUIVI & CODE DE RETRAIT
  // ===========================================================================

  /** Numéro de suivi unique format SL-YYYYMMDD-XXX */
  @Column({ unique: true, type: 'varchar', length: 20 })
  trackingNo: string;

  /**
   * Code de retrait confidentiel à 6 chiffres.
   * Généré aléatoirement, vérifié à l'unicité parmi les colis STORED.
   * JAMAIS exposé dans les endpoints publics.
   */
  @Column({ length: 6, unique: true })
  pickupCode: string;

  // ===========================================================================
  // STATUT
  // ===========================================================================

  /**
   * Statut du colis dans le cycle de vie :
   *   PENDING   → créé, en attente d'acceptation par un livreur
   *   STORED    → déposé en casier ET confirmé, en attente de retrait client
   *   PICKED_UP → retiré par le client final avec le code de retrait
   *   EXPIRED   → délai de retrait de 72h dépassé
   *   RETURNED  → retourné à l'expéditeur
   */
  @Column({ type: 'enum', enum: ParcelStatus, default: ParcelStatus.PENDING })
  status: ParcelStatus;

  // ===========================================================================
  // DESTINATAIRE
  // ===========================================================================

  @Column({ nullable: true, type: 'varchar', length: 20 })
  recipientPhone: string | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  recipientEmail: string | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  recipientName: string | null;

  // ===========================================================================
  // NOTES (CORRECTION 2026-04-28 — était manquant)
  // ===========================================================================

  /**
   * Notes libres sur le colis.
   * Ex: "Colis fragile", "Sonner 2 fois", "Déposer à la réception"
   */
  @Column({ nullable: true, type: 'text' })
  notes: string | null;

  // ===========================================================================
  // RELATIONS
  // ===========================================================================

  @ManyToOne(() => Compartment, { eager: true, nullable: true })
  @JoinColumn()
  compartment: Compartment | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn()
  depositedBy: User | null;

  // ===========================================================================
  // MÉDIAS
  // ===========================================================================

  @Column({ nullable: true, type: 'varchar', length: 500 })
  photoDepositUrl: string | null;

  @Column({ nullable: true, type: 'varchar', length: 500 })
  photoPickupUrl: string | null;

  /**
   * QR code stocké en base64 (data URL PNG).
   * Permet la régénération rapide sans recalcul.
   */
  @Column({ type: 'text', nullable: true })
  qrCodeBase64: string | null;

  // ===========================================================================
  // TIMESTAMPS MÉTIER
  // ===========================================================================

  /** Date de dépôt effectif en casier (après confirmDeposit) */
  @Column({ type: 'timestamptz', nullable: true })
  storedAt: Date | null;

  /** Date de retrait par le client final */
  @Column({ type: 'timestamptz', nullable: true })
  pickedAt: Date | null;

  /**
   * Date d'expiration du code de retrait.
   * Calculée : storedAt + PICKUP_DELAY_HOURS (72h).
   */
  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  // ===========================================================================
  // TIMESTAMPS TECHNIQUES
  // ===========================================================================

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}