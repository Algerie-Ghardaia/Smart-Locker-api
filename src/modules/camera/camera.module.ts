// =============================================================================
// src/modules/camera/camera.module.ts
// MODULE CAMÉRA — Gestion des photos de dépôt/retrait
// =============================================================================

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CameraService } from './camera.service';
import { CameraLog, CameraLogSchema } from './schemas/camera-log.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CameraLog.name, schema: CameraLogSchema }]),
  ],
  providers: [CameraService],
  exports: [CameraService],
})
export class CameraModule {}