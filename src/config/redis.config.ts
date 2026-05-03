// =============================================================================
// src/config/redis.config.ts
// CONFIGURATION REDIS — Cache & Files d'attente Bull
// =============================================================================
// Variables d'environnement attendues dans .env :
//
//   REDIS_HOST     → Hôte Redis              (défaut : localhost)
//   REDIS_PORT     → Port Redis              (défaut : 6379)
//   REDIS_PASSWORD → Mot de passe Redis      (défaut : aucun)
//   REDIS_DB       → Index de la base Redis  (défaut : 0)
// =============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host:     process.env.REDIS_HOST     || 'localhost',
  port:     parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db:       parseInt(process.env.REDIS_DB   || '0',    10),
}));


