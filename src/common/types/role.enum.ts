// =============================================================================
// src/common/types/role.enum.ts
// ENUM — Rôles utilisateur avec permissions hiérarchiques
// =============================================================================
//
// Responsabilités par rôle :
//   ADMIN    → Tous les droits (CRUD casiers, utilisateurs, réservations)
//   OPERATOR → Gestion opérationnelle (casiers, colis, réservations)
//   COURIER  → Dépôt de colis et consultation de ses réservations
//   USER     → Utilisateur standard (réservations, consultation)
//   VIEWER   → Consultation uniquement (lecture seule)
// =============================================================================

export enum Role {
  /** Administrateur - Tous les droits */
  ADMIN = 'admin',

  /** Opérateur - Gestion des casiers et colis */
  OPERATOR = 'operator',

  /** Livreur - Dépôt de colis uniquement */
  COURIER = 'courier',

  /** Utilisateur standard - Réservations et consultation */
  USER = 'user',

  /** Lecteur - Consultation uniquement */
  VIEWER = 'viewer',
}

// ---------------------------------------------------------------------------
// Hiérarchie des permissions
// ---------------------------------------------------------------------------

/**
 * Permissions associées à chaque rôle.
 * Ordre hiérarchique : ADMIN > OPERATOR > COURIER > USER > VIEWER
 */
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [Role.ADMIN]: [
    'lockers:create', 'lockers:update', 'lockers:delete',
    'users:create', 'users:update', 'users:delete',
    'reservations:create', 'reservations:update', 'reservations:cancel', 'reservations:view_all',
    'parcels:deposit', 'parcels:pickup', 'parcels:history',
    'compartments:manage',
    'notifications:manage',
  ],
  [Role.OPERATOR]: [
    'lockers:view',
    'reservations:view_all',
    'parcels:deposit', 'parcels:pickup', 'parcels:history',
    'compartments:view', 'compartments:manage',
  ],
  [Role.COURIER]: [
    'lockers:view',
    'reservations:create', 'reservations:view_own',
    'parcels:deposit',
  ],
  [Role.USER]: [
    'lockers:view',
    'reservations:create', 'reservations:view_own', 'reservations:cancel_own',
  ],
  [Role.VIEWER]: [
    'lockers:view',
    'reservations:view_own',
  ],
};

/**
 * Vérifie si un rôle a une permission spécifique.
 */
export const hasPermission = (role: Role, permission: string): boolean => {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
};