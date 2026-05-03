// =============================================================================
// src/common/decorators/inject-redis.decorator.ts
// DECORATOR — Injection du client Redis
// =============================================================================

import { Inject } from '@nestjs/common';

export const REDIS_CLIENT_TOKEN = 'default_redis_client';

/**
 * Décorateur pour injecter le client Redis.
 * Utilisation : @InjectRedis() private readonly redis: Redis
 */
export const InjectRedis = () => Inject(REDIS_CLIENT_TOKEN);