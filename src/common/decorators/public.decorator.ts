// =============================================================================
// src/common/decorators/public.decorator.ts
// DECORATOR — Marque une route comme publique (pas d'auth requise)
// =============================================================================

import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Décorateur pour rendre une route publique.
 * Les routes publiques ne nécessitent pas d'authentification JWT.
 * 
 * @example
 * @Public()
 * @Get('health')
 * healthCheck() { return { status: 'ok' }; }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);