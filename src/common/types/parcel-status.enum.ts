// =============================================================================
// src/common/types/parcel-status.enum.ts
// ENUM — Statuts des colis dans le cycle de vie complet
// =============================================================================
//
// Cycle de vie standard :
//   PENDING → (accepté par livreur) → STORED → PICKED_UP
//                                          ↘ EXPIRED (72h)
//                                          ↘ RETURNED (retour expéditeur)
//
// Correction (2026-04-28) :
//   - Documentation enrichie du cycle de vie
//   - Clarification : STORED = déposé ET confirmé (pas de statut DEPOSITED séparé)
//   - RETURNED ajouté pour les colis retournés à l'expéditeur
// =============================================================================

export enum ParcelStatus {
  /**
   * En attente d'acceptation par un livreur.
   * Le colis est créé mais pas encore assigné.
   * Aucun locker ni case n'est réservé à ce stade.
   */
  PENDING = 'pending',

  /**
   * Déposé en casier et confirmé par le livreur.
   * Le code de retrait a été envoyé au destinataire.
   * La case est OCCUPIED.
   *
   * ⚠️ CORRECTION : Ce statut couvre à la fois "déposé" et "confirmé".
   * Le statut PICKED_UP n'est atteint que lors du retrait CLIENT.
   */
  STORED = 'stored',

  /**
   * Retiré par le client final avec le code de retrait.
   * La case est redevenue AVAILABLE.
   */
  PICKED_UP = 'picked_up',

  /**
   * Délai de retrait dépassé (72h par défaut).
   * Le colis doit être retourné à l'expéditeur.
   */
  EXPIRED = 'expired',

  /**
   * Retourné à l'expéditeur après expiration ou sur demande.
   */
  RETURNED = 'returned',
}