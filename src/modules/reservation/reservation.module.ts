// =============================================================================
// src/modules/reservation/reservation.module.ts
// MODULE RÉSERVATION — Configuration complète
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReservationController } from './reservation.controller';
import { ReservationService } from './reservation.service';
import { Reservation } from './reservation.entity';
import { Compartment } from '../compartment/compartment.entity';
import { Locker } from '../locker/locker.entity';
import { EventLogModule } from '../event-log/event-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reservation, Compartment, Locker]),
    EventLogModule,
  ],
  controllers: [ReservationController],
  providers: [ReservationService],
  exports: [ReservationService],
})
export class ReservationModule {}