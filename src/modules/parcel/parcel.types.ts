// =============================================================================
// src/modules/parcel/parcel.types.ts
// TYPES PARTAGÉS — Module Parcel (source unique de vérité)
// =============================================================================
//
// Centralise TOUS les types utilisés par parcel.service.ts et parcel.controller.ts.
// Aucun autre fichier ne définit de types pour le module parcel.
//
// Correction (2026-04-28) :
//   - Suppression de GetMissionsOptions (redondant avec MissionTypeFilter)
//   - NoteField ajouté à DepositResult et ParcelDetailInfo
//   - Documentation enrichie
// =============================================================================

import { MissionTypeFilter } from './dto/missions-query.dto';

// =============================================================================
// RÉSULTATS DES OPÉRATIONS MÉTIER
// =============================================================================

/** Résultat retourné après un dépôt de colis réussi (POST /parcels/deposit) */
export interface DepositResult {
  /** Code de retrait confidentiel à 6 chiffres */
  pickupCode: string;
  /** Numéro de la case attribuée (ex: "H01") */
  shelfNo: string;
  /** QR code en base64 (Data URL PNG) */
  qrCode: string;
  /** Numéro de suivi */
  trackingNo: string;
  /** Date d'expiration du code (ISO 8601) */
  expiresAt: string;
}

/** Résultat retourné après un retrait client (POST /parcels/pickup) */
export interface PickupResult {
  /** Numéro de la case à ouvrir */
  shelfNo: string;
  /** Message de confirmation */
  message: string;
}

/** Résultat retourné après confirmation de dépôt par le livreur */
export interface ConfirmDepositResult {
  trackingNo: string;
  pickupCode: string;
  shelfNo: string;
  lockerName: string;
  /** Coordonnées GPS format "latitude,longitude" */
  lockerLocation: string;
  recipientName: string;
  expiresAt: string;
  message: string;
}

// =============================================================================
// SUIVI PUBLIC — GET /parcels/track/:query (sans authentification)
// =============================================================================

/**
 * Informations publiques de suivi.
 * ⚠️ Le pickupCode confidentiel n'est JAMAIS inclus ici.
 */
export interface TrackingPublicInfo {
  trackingNo: string;
  status: string;
  storedAt: string | null;
  expiresAt: string | null;
  pickedAt: string | null;
  shelfNo: string | null;
  lockerName: string | null;
  /** Coordonnées GPS format "latitude,longitude" */
  lockerLocation: string | null;
  recipientName: string | null;
  /** Délai de retrait en heures (permet au frontend de calculer la deadline) */
  pickupDelayHours: number;
}

// =============================================================================
// DÉTAIL AUTHENTIFIÉ — GET /parcels/:trackingNo (JWT requis)
// =============================================================================

/** Détail complet exposant toutes les données (pickupCode, coordonnées...) */
export interface ParcelDetailInfo {
  id: string;
  trackingNo: string;
  status: string;
  /** Code de retrait confidentiel (visible uniquement par les opérateurs/admin) */
  pickupCode: string;
  recipientName: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  lockerName: string | null;
  /** Coordonnées GPS format "latitude,longitude" */
  lockerLocation: string | null;
  shelfNo: string | null;
  size: string | null;
  storedAt: string | null;
  pickedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  qrCodeBase64: string | null;
  photoDepositUrl: string | null;
  photoPickupUrl: string | null;
  /** Notes libres sur le colis */
  notes: string | null;
  depositedBy: string | null;
  pickupDelayHours: number;
}

// =============================================================================
// HISTORIQUE PAGINÉ
// =============================================================================

export interface ParcelHistoryItem {
  id: string;
  trackingNo: string;
  pickupCode: string;
  status: string;
  recipientName: string | null;
  recipientPhone: string | null;
  shelfNo: string | null;
  lockerName: string | null;
  storedAt: string | null;
  pickedAt: string | null;
  expiresAt: string | null;
  depositedBy: string | null;
  depositedById: string | null;
}

export interface PaginatedHistory {
  data: ParcelHistoryItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// =============================================================================
// MISSIONS LIVREUR — Feed style Uber
// =============================================================================

/**
 * Mission retournée par GET /parcels/missions.
 *
 * Deux contextes d'affichage :
 *   - myParcels        → colis STORED déposés par le livreur connecté
 *   - availableMissions → colis PENDING disponibles à accepter
 */
export interface MissionItem {
  id: string;
  trackingNo: string;
  status: string;
  recipientName: string | null;
  recipientPhone: string | null;
  lockerName: string | null;
  /** Coordonnées GPS format "latitude,longitude" (null si pas de locker) */
  lockerLocation: string | null;
  shelfNo: string | null;
  storedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  /** true si le livreur connecté est le déposant */
  isMine: boolean;
  /** Rémunération estimée en euros */
  earnings: number;
}

// =============================================================================
// OPTIONS DE FILTRAGE (réutilise MissionTypeFilter du DTO)
// =============================================================================

/** Options de filtrage pour getMissions() — aligné sur MissionsQueryDto */
export type GetMissionsOptions = {
  type?: MissionTypeFilter;
};