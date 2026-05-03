// =============================================================================
// src/common/helpers/code-generator.helper.ts
// HELPER — Génération de codes de retrait
// =============================================================================

import { randomInt } from 'crypto';

/**
 * Génère un code de retrait numérique de longueur donnée.
 * @param length - Longueur du code (défaut: 6)
 * @returns Code numérique (ex: "123456")
 */
export function generatePickupCode(length = 6): string {
  const digits = Array.from({ length }, () => randomInt(0, 10));
  return digits.join('');
}

/**
 * Génère un code alphanumérique sécurisé (majuscules + chiffres).
 * Évite les caractères ambigus (I, O, 0, 1).
 * @param length - Longueur du code (défaut: 6)
 * @returns Code alphanumérique (ex: "A3F8B2")
 */
export function generateSecureCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[randomInt(0, chars.length)]).join('');
}

/**
 * Vérifie si un code de retrait est valide.
 * @param code - Code à vérifier
 * @returns true si le code est valide (4-20 caractères alphanumériques)
 */
export function isValidPickupCode(code: string): boolean {
  if (!code || typeof code !== 'string') return false;
  const cleaned = code.trim().replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return cleaned.length >= 4 && cleaned.length <= 20;
}