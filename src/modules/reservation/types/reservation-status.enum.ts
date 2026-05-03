// =============================================================================
// src/modules/reservation/types/reservation-status.enum.ts
// ENUM — Statuts des réservations
// =============================================================================

export enum ReservationStatus {
  /** Réservation confirmée, en attente de début */
  CONFIRMED = 'confirmed',
  
  /** Réservation active, en cours */
  ACTIVE = 'active',
  
  /** Colis déposé dans la case réservée */
  OCCUPIED = 'occupied',
  
  /** Réservation terminée normalement */
  COMPLETED = 'completed',
  
  /** Réservation annulée par l'utilisateur */
  CANCELLED = 'cancelled',
  
  /** Réservation expirée (non honorée) */
  EXPIRED = 'expired',
}