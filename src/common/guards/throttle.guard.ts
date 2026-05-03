// =============================================================================
// src/common/guards/throttle.guard.ts
// GUARD — Rate Limiting (protection contre les abus)
// =============================================================================

import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottleGuard extends ThrottlerGuard {
  /**
   * Récupère l'identifiant unique pour le rate limiting.
   * Utilise l'IP réelle (en tenant compte des proxies).
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // Priorité à l'en-tête X-Forwarded-For (si derrière un proxy)
    const forwarded = req.headers?.['x-forwarded-for'];
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    // Sinon utiliser l'IP directe
    return req.ip || req.connection?.remoteAddress || 'unknown';
  }

  /**
   * Personnalisation du message d'erreur en cas de limite dépassée.
   */
  protected async throwThrottlingException(context: ExecutionContext): Promise<void> {
    const response = context.switchToHttp().getResponse();
    response.status(429).json({
      statusCode: 429,
      message: 'Trop de requêtes. Veuillez réessayer plus tard.',
      timestamp: new Date().toISOString(),
    });
  }
}