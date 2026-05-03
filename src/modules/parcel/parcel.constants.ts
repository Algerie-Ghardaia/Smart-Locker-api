// =============================================================================
// src/modules/parcel/parcel.constants.ts
// CONSTANTES MÉTIER — Source unique pour les règles de durée
// =============================================================================

/** Délai de retrait en heures (expiresAt = storedAt + PICKUP_DELAY_HOURS) */
export const PICKUP_DELAY_HOURS = 72; // 3 jours

/** Délai en millisecondes (pré-calculé) */
export const PICKUP_DELAY_MS = PICKUP_DELAY_HOURS * 60 * 60 * 1000;

/** Rémunération de base par colis livré (peut évoluer vers une table dynamique) */
export const BASE_EARNINGS_PER_PARCEL = 4.50; // €