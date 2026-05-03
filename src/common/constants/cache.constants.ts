// =============================================================================
// src/common/constants/cache.constants.ts
// CONSTANTES — TTL et préfixes pour le cache Redis
// =============================================================================
//
// Centralise toutes les constantes de cache pour éviter les TTL "en dur"
// dans les services et garantir une cohérence globale.
// =============================================================================

/** TTL par défaut pour les clés de compartiments (24 heures) */
export const COMPARTMENT_CACHE_TTL = 24 * 60 * 60; // secondes

/** TTL pour les refresh tokens (7 jours) */
export const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // secondes

/** Préfixe pour les clés Redis des compartiments */
export const COMPARTMENT_KEY_PREFIX = 'locker';

/**
 * Construit une clé Redis pour les compartiments d'un casier.
 * @param lockerId - UUID du casier
 * @returns Clé Redis formatée (ex: "locker:abc123:compartments")
 */
export function buildCompartmentKey(lockerId: string): string {
  return `${COMPARTMENT_KEY_PREFIX}:${lockerId}:compartments`;
}

