// =============================================================================
// src/common/types/compartment-status.enum.ts
// ENUM — Statuts des compartiments
// =============================================================================

export enum CompartmentStatus {
  /** Disponible */
  AVAILABLE = 'available',
  
  /** Occupé par un colis */
  OCCUPIED = 'occupied',
  
  /** En maintenance */
  MAINTENANCE = 'maintenance',
  
  /** Erreur (serrure défectueuse, etc.) */
  ERROR = 'error',
  
  /** Réservé (pour un dépôt planifié) */
  RESERVED = 'reserved',
}