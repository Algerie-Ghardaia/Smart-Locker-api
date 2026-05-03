// =============================================================================
// src/modules/parcel/parcel.module.ts
// MODULE COLIS — Configuration complète
// =============================================================================
//
// Dépendances :
//   - TypeORM (Parcel, Compartment)
//   - Bull (file SMS)
//   - HardwareModule (serrures physiques)
//   - EventLogModule (audit)
//   - RedisModule (cache temps réel)
//   - LockerGateway (WebSocket)
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ParcelController } from './parcel.controller';
import { ParcelService } from './parcel.service';
import { Parcel } from './parcel.entity';
import { Compartment } from '../compartment/compartment.entity';
import { CompartmentModule } from '../compartment/compartment.module';
import { HardwareModule } from '../hardware/hardware.module';
import { EventLogModule } from '../event-log/event-log.module';
import { RedisModule } from '../redis/redis.module';
import { LockerGateway } from '../../gateways/locker.gateway';

@Module({
  imports: [
    TypeOrmModule.forFeature([Parcel, Compartment]),
    CompartmentModule,
    BullModule.registerQueue({ name: 'sms' }),
    HardwareModule,
    EventLogModule,
    RedisModule,
  ],
  controllers: [ParcelController],
  providers: [ParcelService, LockerGateway],
  exports: [ParcelService],
})
export class ParcelModule {}
