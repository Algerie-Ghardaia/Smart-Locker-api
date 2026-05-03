// =============================================================================
// src/modules/event-log/schemas/event-log.schema.ts
// SCHÉMA MONGODB — Logs d'événements avec traçabilité utilisateur
// =============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type EventLogDocument = EventLog & Document;

/** Types d'événements supportés */
export enum EventType {
  DEPOSIT = 'deposit',
  DEPOSIT_CONFIRMED = 'deposit_CONFIRMED',
  PICKUP = 'pickup',
  MAINTENANCE = 'maintenance',
  ERROR = 'error',
  UNLOCK = 'unlock',
  LOCKER_OPEN = 'locker_open',
  COMPARTMENT_STATUS_CHANGE = 'compartment_status_change',
}

@Schema({ 
  timestamps: true,
  collection: 'event_logs',
})
export class EventLog {
  // ===========================================================================
  // Champs obligatoires
  // ===========================================================================

  @Prop({ 
    required: true, 
    enum: Object.values(EventType),
    index: true,
  })
  type: EventType;

  @Prop({ 
    required: true,
    index: true,
  })
  lockerId: string;

  @Prop({ required: true })
  shelfNo: string;

  // ===========================================================================
  // Champs optionnels
  // ===========================================================================

  @Prop({ 
    index: true,
    sparse: true,
  })
  parcelId?: string;

  @Prop({ 
    index: true,
    sparse: true,
  })
  userId?: string;

  @Prop()
  username?: string;

  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  // ===========================================================================
  // Timestamps (gérés automatiquement par Mongoose)
  // ===========================================================================

  createdAt: Date;
  updatedAt: Date;
}

export const EventLogSchema = SchemaFactory.createForClass(EventLog);

// ===========================================================================
// Indexes composés pour optimiser les requêtes fréquentes
// ===========================================================================

EventLogSchema.index({ lockerId: 1, createdAt: -1 });
EventLogSchema.index({ type: 1, createdAt: -1 });
EventLogSchema.index({ userId: 1, createdAt: -1 });
EventLogSchema.index({ parcelId: 1 });


