// =============================================================================
// src/common/helpers/date.helper.ts
// HELPER — Conversions de dates robustes (source unique)
// =============================================================================
//
// Centralise toutes les conversions de dates pour éviter la redondance
// de la méthode privée toISO() qui était dupliquée dans ParcelService.
//
// Utilisation :
//   import { dateToIso } from '@common/helpers/date.helper';
//   const iso = dateToIso(parcel.storedAt);
// =============================================================================

/**
 * Convertit une valeur de date en string ISO 8601 de manière robuste.
 * Protège contre les dates invalides et les valeurs nulles.
 *
 * @param value - Date (objet Date), string ISO, ou null/undefined
 * @returns Chaîne ISO 8601 ou null si la valeur est invalide/absente
 *
 * @example
 * dateToIso(new Date())              // "2026-04-28T12:00:00.000Z"
 * dateToIso("2026-04-28T12:00:00Z") // "2026-04-28T12:00:00.000Z"
 * dateToIso(null)                    // null
 * dateToIso(undefined)               // null
 * dateToIso("invalid")               // null
 */
export function dateToIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value.toISOString();
  }

  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Formatte des coordonnées latitude/longitude en chaîne "lat,lng"
 * pour la consommation par Leaflet/OpenStreetMap.
 *
 * @param latitude  - Latitude (nombre décimal)
 * @param longitude - Longitude (nombre décimal)
 * @returns Chaîne "latitude,longitude" ou null si les valeurs sont absentes
 *
 * @example
 * formatGpsCoordinates(36.717, 3.183) // "36.717,3.183"
 * formatGpsCoordinates(null, 3.183)   // null
 */
export function formatGpsCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
): string | null {
  if (latitude == null || longitude == null) return null;
  return `${latitude},${longitude}`;
}