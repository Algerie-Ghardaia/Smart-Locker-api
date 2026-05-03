// =============================================================================
// src/modules/locker/locker.entity.ts
// ENTITÉ CASIER — Borne physique SmartLocker (COMPLET — REFONDU)
// =============================================================================
//
// Représente une borne physique SmartLocker déployée sur le terrain.
//
// Colonnes organisées par domaine fonctionnel :
//   1. Identification (name, serialNumber)
//   2. Localisation postale (location, address, postalCode, city, wilaya*)
//   3. Coordonnées GPS (latitude, longitude)
//   4. Informations techniques (ipAddress, firmwareVersion, isActive)
//   5. Évaluation (rating)
//   6. Relations (compartments)
//   7. Timestamps (createdAt, updatedAt, lastHeartbeat)
//
// Correction (2026-04-28) :
//   - Documentation JSDoc enrichie pour chaque colonne
//   - Précision sur le format GPS (degrés décimaux, WGS84)
//   - Rappel : la colonne 'location' est du texte descriptif,
//     PAS les coordonnées GPS (qui sont dans latitude/longitude)
// =============================================================================

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Compartment } from '../compartment/compartment.entity';

@Entity('lockers')
export class Locker {
  // ===========================================================================
  // 1. IDENTIFICATION
  // ===========================================================================

  /** Identifiant unique UUID généré automatiquement */
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Nom unique du casier.
   * Convention : SL-{wilaya}-{ville_abbr}-{quartier_abbr}-{numero}
   * Exemple : "SL-16-ALG-BABEZ-001"
   */
  @Column({ unique: true, type: 'varchar', length: 50 })
  name: string;

  /**
   * Numéro de série constructeur.
   * Exemple : "SL-DZ-2026-00001"
   */
  @Column({ nullable: true, unique: true, type: 'varchar', length: 50 })
  serialNumber: string | null;

  // ===========================================================================
  // 2. LOCALISATION POSTALE
  // ===========================================================================

  /**
   * Description textuelle de l'emplacement.
   * Exemple : "Centre Commercial Bab Ezzouar, Niveau 0 — Entrée principale"
   *
   * ⚠️ Ce champ est du TEXTE DESCRIPTIF, PAS des coordonnées GPS.
   * Pour la carte Leaflet, utilisez latitude + longitude.
   */
  @Column({ nullable: true, type: 'varchar', length: 500 })
  location: string | null;

  /** Adresse postale complète */
  @Column({ nullable: true, type: 'varchar', length: 500 })
  address: string | null;

  /** Code postal (ex: "16000") */
  @Column({ nullable: true, type: 'varchar', length: 10 })
  postalCode: string | null;

  /** Ville (ex: "Alger") */
  @Column({ nullable: true, type: 'varchar', length: 100 })
  city: string | null;

  /**
   * Code de la wilaya (ex: "16" pour Alger).
   * Format : chaîne de 2 chiffres.
   */
  @Column({ nullable: true, type: 'varchar', length: 2 })
  wilayaCode: string | null;

  /** Nom de la wilaya (ex: "Alger") */
  @Column({ nullable: true, type: 'varchar', length: 100 })
  wilayaName: string | null;

  // ===========================================================================
  // 3. COORDONNÉES GPS
  // ===========================================================================

  /**
   * Latitude en degrés décimaux (WGS84).
   * Plage : -90 à 90.
   * Exemple : 36.7170000 (Alger)
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  latitude: number | null;

  /**
   * Longitude en degrés décimaux (WGS84).
   * Plage : -180 à 180.
   * Exemple : 3.1830000 (Alger)
   */
  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  longitude: number | null;

  // ===========================================================================
  // 4. INFORMATIONS TECHNIQUES
  // ===========================================================================

  /** Description technique ou note interne */
  @Column({ nullable: true, type: 'text' })
  description: string | null;

  /** Adresse IP du casier sur le réseau local */
  @Column({ nullable: true, type: 'varchar', length: 15 })
  ipAddress: string | null;

  /** Version du firmware embarqué */
  @Column({ nullable: true, type: 'varchar', length: 20 })
  firmwareVersion: string | null;

  /**
   * État d'activation du casier.
   * false = casier désactivé (maintenance, hors service).
   * Les casiers inactifs ne sont PAS retournés par findAllForMap().
   */
  @Column({ default: true })
  isActive: boolean;

  /** Date du dernier heartbeat reçu du casier (null si jamais connecté) */
  @Column({ type: 'timestamptz', nullable: true })
  lastHeartbeat: Date | null;

  // ===========================================================================
  // 5. ÉVALUATION
  // ===========================================================================

  /**
   * Note moyenne du casier sur 5.
   * Mise à jour périodiquement via le système d'évaluation.
   */
  @Column({ type: 'decimal', precision: 2, scale: 1, nullable: true })
  rating: number | null;

  // ===========================================================================
  // 6. RELATIONS
  // ===========================================================================

  /**
   * Compartiments du casier.
   * Relation OneToMany vers l'entité Compartment.
   * Chargement eager: false (chargé explicitement quand nécessaire).
   */
  @OneToMany(() => Compartment, (c) => c.locker, {
    cascade: true,
    eager: false,
  })
  compartments: Compartment[];

  // ===========================================================================
  // 7. TIMESTAMPS
  // ===========================================================================

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
