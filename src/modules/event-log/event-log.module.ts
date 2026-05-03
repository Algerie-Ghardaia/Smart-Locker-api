// =============================================================================
// src/modules/event-log/event-log.module.ts
// MODULE LOGS — Enregistrement des événements dans MongoDB
// =============================================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventLogService } from './event-log.service';
import { EventLog, EventLogSchema } from './schemas/event-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: EventLog.name, schema: EventLogSchema }]),
  ],
  providers: [EventLogService],
  exports: [EventLogService],
})
export class EventLogModule {}

