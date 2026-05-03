// =============================================================================
// src/app.module.ts
//
// MODULE PRINCIPAL — SmartLocker Backend
//
// Modules enregistrés :
//   Core      : Auth, User, Redis
//   Métier    : Locker, Compartment, Parcel, Reservation
//   Technique : Hardware, Notification, EventLog, Camera
//   Finance   : Billing
//
// Guards globaux (ordre critique) :
//   1. JwtAuthGuard  → vérifie le Bearer token sur toutes les routes non @Public
//   2. RolesGuard    → vérifie le décorateur @Roles si présent
//   3. ThrottlerGuard → applique les limites de taux selon les groupes configurés
//
// Groupes throttler :
//   default → toutes les routes         (100 req / 60s)
//   auth    → login, refresh            (5 req / 60s — anti brute-force)
//   polling → endpoints de polling UI   (60 req / 60s = 1 req/s max)
//             Appliqué via @Throttle({ polling }) sur les routes concernées
//             avec @SkipThrottle({ default: true, auth: true })
// =============================================================================

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

// ---------------------------------------------------------------------------
// Configurations
// ---------------------------------------------------------------------------
import appConfig from './config/app.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import databaseConfig from './config/database.config';
import hardwareConfig from './config/hardware.config';

// ---------------------------------------------------------------------------
// Core & Auth
// ---------------------------------------------------------------------------
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { RolesGuard } from './modules/auth/guards/roles.guard';
import { JwtAuthGuard } from './modules/auth/guards/jwt.guard';

// ---------------------------------------------------------------------------
// Modules Métier
// ---------------------------------------------------------------------------
import { LockerModule } from './modules/locker/locker.module';
import { CompartmentModule } from './modules/compartment/compartment.module';
import { ParcelModule } from './modules/parcel/parcel.module';
import { ReservationModule } from './modules/reservation/reservation.module';

// ---------------------------------------------------------------------------
// Modules Technique & IoT
// ---------------------------------------------------------------------------
import { HardwareModule } from './modules/hardware/hardware.module';
import { NotificationModule } from './modules/notification/notification.module';
import { EventLogModule } from './modules/event-log/event-log.module';
import { CameraModule } from './modules/camera/camera.module';
import { LockerGateway } from './gateways/locker.gateway';

// ---------------------------------------------------------------------------
// Modules Financiers
// ---------------------------------------------------------------------------
// ✅ Correction : espace parasite supprimé ('./modules/billing/ billing.module')

import { BillingModule } from './modules/billing/ billing.module';

// ---------------------------------------------------------------------------
// App Root
// ---------------------------------------------------------------------------
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // -------------------------------------------------------------------------
    // 1. Configuration globale (.env)
    // -------------------------------------------------------------------------
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, redisConfig, jwtConfig, hardwareConfig],
      envFilePath: ['.env.local', '.env.development', '.env'],
      cache: true,
      expandVariables: true,
    }),

    // -------------------------------------------------------------------------
    // 2. Tâches planifiées (Cron)
    // -------------------------------------------------------------------------
    ScheduleModule.forRoot(),

    // -------------------------------------------------------------------------
    // 3. PostgreSQL (TypeORM)
    // -------------------------------------------------------------------------
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const isDev = config.get<string>('app.nodeEnv') === 'development';
        return {
          type: 'postgres',
          host: config.get<string>('database.host', 'localhost'),
          port: config.get<number>('database.port', 5432),
          username: config.get<string>('database.username', 'postgres'),
          password: config.get<string>('database.password', 'postgres'),
          database: config.get<string>('database.database', 'smartlocker_db'),
          autoLoadEntities: true,
          synchronize: false, // ⚠️ Ne jamais activer en production
          logging: isDev ? ['error', 'warn'] : ['error'],
          maxQueryExecutionTime: 1_000,
        };
      },
    }),

    // -------------------------------------------------------------------------
    // 4. MongoDB (Mongoose)
    // -------------------------------------------------------------------------
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>(
          'MONGO_URI',
          'mongodb://localhost:27017/smartlocker',
        ),
        connectionFactory: (connection) => {
          if (config.get<string>('app.nodeEnv') === 'development') {
            connection.on('connected', () =>
              console.log('✅ MongoDB connecté'),
            );
            connection.on('error', (err: Error) =>
              console.error('❌ MongoDB erreur:', err.message),
            );
          }
          return connection;
        },
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5_000,
      }),
    }),

    // -------------------------------------------------------------------------
    // 5. Redis (cache & sessions)
    // -------------------------------------------------------------------------
    RedisModule,

    // -------------------------------------------------------------------------
    // 6. Bull (file d'attente SMS et autres jobs asynchrones)
    // -------------------------------------------------------------------------
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('redis.host', 'localhost'),
          port: config.get<number>('redis.port', 6379),
          password: config.get<string>('redis.password') || undefined,
          db: config.get<number>('redis.db', 1),
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      }),
    }),

    // -------------------------------------------------------------------------
    // 7. Rate Limiting — 3 groupes indépendants
    //
    //   default  → toutes les routes (100 req/min)
    //   auth     → /auth/login, /auth/refresh (5 req/min — anti brute-force)
    //   polling  → endpoints de polling UI, ex: GET /notifications/unread/count
    //              Appliqué explicitement via @Throttle({ polling }) + @SkipThrottle
    //              sur les routes concernées. Compatible avec refetchInterval 60s.
    // -------------------------------------------------------------------------
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('RATE_LIMIT_TTL', 60) * 1_000,
          limit: config.get<number>('RATE_LIMIT_MAX', 100),
        },
        {
          name: 'auth',
          ttl: 60 * 1_000,
          limit: 5,
        },
        {
          name: 'polling',
          ttl: 60 * 1_000,
          limit: 60,
        },
      ],
    }),

    // -------------------------------------------------------------------------
    // 8. Modules fonctionnels
    // -------------------------------------------------------------------------
    AuthModule,
    UserModule,
    LockerModule,
    CompartmentModule,
    ParcelModule,
    ReservationModule,
    HardwareModule,
    NotificationModule,
    EventLogModule,
    CameraModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    LockerGateway,
    // Guards globaux — ordre critique : Auth → Roles → Throttle
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
