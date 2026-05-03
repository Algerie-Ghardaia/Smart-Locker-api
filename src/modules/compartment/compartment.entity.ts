// =============================================================================
// src/modules/compartment/compartment.entity.ts
// ENTITÉ COMPARTIMENT — Case individuelle d'un casier SmartLocker
// =============================================================================
// Représente un compartiment physique au sein d'un casier (locker).
// Contrainte métier : shelfNo est unique PAR casier (lockerId + shelfNo),
// mais deux casiers différents peuvent avoir le même shelfNo (ex: H01).
// =============================================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Unique,
  Index,
} from 'typeorm';

import { Locker } from '../locker/locker.entity';
import { CompartmentSize } from '../../common/types/compartment-size.enum';
import { CompartmentStatus } from '../../common/types/compartment-status.enum';

// =============================================================================
// CONTRAINTE UNIQUE COMPOSITE
// Un shelfNo (ex: "H01") doit être unique au sein d'un même casier,
// mais peut exister dans plusieurs casiers différents.
// =============================================================================
@Entity('compartments')
@Unique('UQ_compartment_locker_shelf', ['lockerId', 'shelfNo'])
export class Compartment {
  // ---------------------------------------------------------------------------
  // IDENTIFIANT
  // ---------------------------------------------------------------------------

  /** Identifiant unique UUID du compartiment */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ---------------------------------------------------------------------------
  // RÉFÉRENCE AU CASIER PARENT
  // ---------------------------------------------------------------------------

  /**
   * Clé étrangère vers le casier parent.
   * Fait partie de la contrainte unique composite avec shelfNo.
   */
  @Index()
  @Column({ type: 'uuid' })
  lockerId: string;

  /** Relation ManyToOne vers l'entité Locker parent */
  @ManyToOne(() => Locker, (locker) => locker.compartments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'lockerId' })
  locker: Locker;

  // ---------------------------------------------------------------------------
  // IDENTIFICATION PHYSIQUE DU COMPARTIMENT
  // ---------------------------------------------------------------------------

  /**
   * Identifiant de position physique sur le casier.
   * Convention : "H" = rangée haute, "B" = rangée basse + numéro de position.
   * Ex: "H01", "B03"
   * Unique par casier (voir contrainte composite ci-dessus).
   */
  @Column({ type: 'varchar', length: 10 })
  shelfNo: string;

  /**
   * Numéro du board électronique gérant ce compartiment.
   * Chaque board contrôle plusieurs verrous.
   */
  @Column({ type: 'smallint' })
  boardNo: number;

  /**
   * Numéro du verrou sur le board.
   * Combiné avec boardNo, identifie le verrou physique à actionner.
   */
  @Column({ type: 'smallint' })
  lockNo: number;

  // ---------------------------------------------------------------------------
  // CONFIGURATION DU COMPARTIMENT
  // ---------------------------------------------------------------------------

  /**
   * Taille du compartiment : S, M, L, XL.
   * Détermine les dimensions physiques et le type de colis accepté.
   */
  @Column({
    type: 'enum',
    enum: CompartmentSize,
    default: CompartmentSize.M,
  })
  size: CompartmentSize;

  // ---------------------------------------------------------------------------
  // ÉTAT OPÉRATIONNEL
  // ---------------------------------------------------------------------------

  /**
   * Statut courant du compartiment.
   * Valeurs possibles : AVAILABLE, OCCUPIED, RESERVED, MAINTENANCE, etc.
   */
  @Column({
    type: 'enum',
    enum: CompartmentStatus,
    default: CompartmentStatus.AVAILABLE,
  })
  status: CompartmentStatus;

  /**
   * Identifiant UUID du colis actuellement stocké dans ce compartiment.
   * Null si le compartiment est libre.
   */
  @Index()
  @Column({ type: 'uuid', nullable: true, default: null })
  currentParcelId: string | null;

  // ---------------------------------------------------------------------------
  // HORODATAGES
  // ---------------------------------------------------------------------------

  /** Date et heure de création de l'enregistrement */
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  /** Date et heure de la dernière mise à jour */
  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
