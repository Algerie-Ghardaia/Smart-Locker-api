// =============================================================================
// src/modules/camera/camera.service.ts
// SERVICE CAMÉRA — Gestion des photos
// =============================================================================

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CameraLog, CameraLogDocument } from './schemas/camera-log.schema';

@Injectable()
export class CameraService {
  constructor(
    @InjectModel(CameraLog.name) private cameraLogModel: Model<CameraLogDocument>,
  ) {}

  async savePhoto(data: {
    parcelId: string;
    type: 'deposit' | 'pickup';
    imageUrl: string;
  }): Promise<CameraLog> {
    const log = new this.cameraLogModel({
      ...data,
      timestamp: new Date(),
    });
    return log.save();
  }

  async findByParcel(parcelId: string): Promise<CameraLog[]> {
    return this.cameraLogModel
      .find({ parcelId })
      .sort({ timestamp: -1 })
      .exec();
  }
}