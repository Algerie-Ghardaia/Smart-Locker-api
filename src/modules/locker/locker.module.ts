// =============================================================================
// src/modules/locker/locker.module.ts
// MODULE CASIERS — Avec dépendances Compartment et Redis
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LockerController } from './locker.controller';
import { LockerService } from './locker.service';
import { Locker } from './locker.entity';
import { Compartment } from '../compartment/compartment.entity';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [TypeOrmModule.forFeature([Locker, Compartment]), RedisModule],
  controllers: [LockerController],
  providers: [LockerService],
  exports: [LockerService],
})
export class LockerModule {}
