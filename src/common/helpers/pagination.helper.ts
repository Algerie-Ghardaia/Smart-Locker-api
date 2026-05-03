// =============================================================================
// src/common/helpers/pagination.helper.ts
// HELPER — Pagination des résultats
// =============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Pagine un tableau de résultats.
 * @param data - Données à paginer
 * @param total - Nombre total d'éléments
 * @param options - Options de pagination
 * @returns Résultat paginé avec métadonnées
 */
export function paginate<T>(
  data: T[],
  total: number,
  options: PaginationOptions = {}
): PaginatedResult<T> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Calcule l'offset pour une requête SQL.
 * @param page - Numéro de page (commence à 1)
 * @param limit - Nombre d'éléments par page
 * @returns Offset
 */
export function getOffset(page: number, limit: number): number {
  return (Math.max(1, page) - 1) * Math.max(1, limit);
}