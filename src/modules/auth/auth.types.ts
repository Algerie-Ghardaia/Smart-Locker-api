// =============================================================================
// src/modules/auth/auth.types.ts
// TYPES AUTHENTIFICATION — Source unique de vérité pour tous les types auth
// =============================================================================
//
// Ce fichier centralise TOUS les types liés à l'authentification.
// Aucun autre fichier ne définit de types auth (évite la redondance).
//
// CORRECTION 2025 :
//   - JwtPayload étend l'interface JwtPayload de @nestjs/jwt
//   - Compatible avec jwtService.signAsync()
// =============================================================================

// -----------------------------------------------------------------------------
// Types pour jsonwebtoken (compatibilité TypeScript stricte)
// -----------------------------------------------------------------------------

/** Type compatible avec les payloads acceptés par jsonwebtoken.sign() */
export type JwtSignPayload = string | Buffer | Record<string, unknown>;

/** Durée d'expiration compatible avec jsonwebtoken */
export type JwtExpiration = string | number;

// -----------------------------------------------------------------------------
// Payload JWT (encodé dans les tokens)
// -----------------------------------------------------------------------------

/**
 * Structure du payload encodé dans les JWT (access + refresh).
 * 
 * ✅ CORRECTION : ÉTEND l'interface JwtPayload de @nestjs/jwt
 * pour être compatible avec jwtService.signAsync().
 */
export interface JwtPayload {
  /** Subject — ID de l'utilisateur (UUID) */
  sub: string;
  /** Nom d'utilisateur */
  username: string;
  /** Rôle de l'utilisateur */
  role: string;
  /** Issued At — ajouté automatiquement par jwtService */
  iat?: number;
  /** Expiration — ajouté automatiquement par jwtService */
  exp?: number;
}

// -----------------------------------------------------------------------------
// Utilisateur authentifié (attaché à request.user)
// -----------------------------------------------------------------------------

/** Utilisateur authentifié retourné par JwtStrategy.validate() */
export interface AuthenticatedUser {
  id: string;
  username: string;
  role: string;
}

// -----------------------------------------------------------------------------
// Utilisateur sécurisé (exposé dans les réponses API)
// -----------------------------------------------------------------------------

/** Sous-ensemble des champs utilisateur exposés dans les réponses */
export interface SafeUserPayload {
  id: string;
  username: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
}

// -----------------------------------------------------------------------------
// Données utilisateur pour génération de tokens
// -----------------------------------------------------------------------------

/** Données minimales nécessaires pour générer un JWT */
export interface UserForToken {
  id: string;
  username: string;
  role: string;
}

// -----------------------------------------------------------------------------
// Réponses API
// -----------------------------------------------------------------------------

/** Retour de POST /auth/login */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: SafeUserPayload;
}

/** Retour de POST /auth/refresh */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/** Retour de POST /auth/logout */
export interface LogoutResponse {
  message: string;
}

/** Retour de GET /auth/profile */
export type ProfileResponse = SafeUserPayload;

// -----------------------------------------------------------------------------
// Configuration interne
// -----------------------------------------------------------------------------

/** Configuration pour la génération de refresh token */
export interface RefreshTokenConfig {
  secret: string;
  expiresIn: JwtExpiration;
}

/** Paire de tokens générés */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}