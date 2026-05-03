// =============================================================================
// src/common/helpers/md5.helper.ts
// HELPER — Génération et vérification de signatures MD5
// Utilisé pour l'authentification des boards HTTP
// =============================================================================

import { createHash } from 'crypto';

/**
 * Génère une signature MD5 à partir de paramètres + secret.
 * @param params - Paramètres à signer
 * @returns Signature MD5 hexadécimale
 */
export function generateMd5Sign(...params: string[]): string {
  const secret = process.env.LOCKER_SECRET ?? 'default_secret';
  return createHash('md5')
    .update(params.join('') + secret)
    .digest('hex');
}

/**
 * Vérifie une signature MD5.
 * @param sign - Signature à vérifier
 * @param params - Paramètres signés
 * @returns true si la signature est valide
 */
export function verifyMd5Sign(sign: string, ...params: string[]): boolean {
  return generateMd5Sign(...params) === sign;
}