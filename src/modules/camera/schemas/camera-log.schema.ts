// =============================================================================
// src/modules/camera/schemas/camera-log.schema.ts
// SCHÉMA MONGODB — Logs des photos
// =============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CameraLogDocument = CameraLog & Document;

@Schema({ timestamps: true })
export class CameraLog {
  @Prop({ required: true })
  parcelId: string;

  @Prop({ required: true, enum: ['deposit', 'pickup'] })
  type: string;

  @Prop({ required: true })
  imageUrl: string;

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const CameraLogSchema = SchemaFactory.createForClass(CameraLog);