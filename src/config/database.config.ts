// =============================================================================
// src/config/database.config.ts
// CONFIGURATION POSTGRESQL — TypeORM
// =============================================================================
// Variables d'environnement attendues dans .env :
//
//   DB_HOST      → Hôte PostgreSQL          (défaut : localhost)
//   DB_PORT      → Port PostgreSQL           (défaut : 5432)
//   DB_USERNAME  → Nom d'utilisateur         (défaut : postgres)
//   DB_PASSWORD  → Mot de passe              (défaut : postgres)
//   DB_DATABASE  → Nom de la base de données (défaut : smartlocker_db)
//   DB_LOGGING   → Activer les logs SQL      (défaut : false)
// =============================================================================

import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host:     process.env.DB_HOST     || 'localhost',
  port:     parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'smartlocker_db',
  logging:  process.env.DB_LOGGING  === 'true',
}));