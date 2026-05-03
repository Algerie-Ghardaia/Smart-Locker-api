// =============================================================================
// src/modules/redis/redis.module.ts
// MODULE REDIS — Fournisseur global du client Redis
// =============================================================================

import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService): Redis => {
        const logger = new Logger('RedisClient');
        
        const client = new Redis({
          host: configService.get<string>('redis.host', 'localhost'),
          port: configService.get<number>('redis.port', 6379),
          password: configService.get<string>('redis.password') || undefined,
          db: configService.get<number>('redis.db', 0),
          lazyConnect: true,
          retryStrategy: (times: number) => {
            const delay = Math.min(times * 50, 2000);
            logger.warn(`Redis reconnection attempt ${times} in ${delay}ms`);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
        });

        client.on('connect', () => {
          logger.log('✅ Redis client connected');
        });

        client.on('ready', () => {
          logger.log('✅ Redis client ready');
        });

        client.on('error', (error) => {
          logger.error(`❌ Redis client error: ${error.message}`);
        });

        client.on('close', () => {
          logger.warn('⚠️ Redis client connection closed');
        });

        // Connexion automatique
        client.connect().catch((err) => {
          logger.error(`Failed to connect to Redis: ${err.message}`);
        });

        return client;
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}

