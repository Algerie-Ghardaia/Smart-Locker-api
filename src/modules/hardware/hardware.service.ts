// =============================================================================
// src/modules/hardware/hardware.service.ts
// SERVICE HARDWARE — Abstraction du contrôle matériel
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { Rs485Driver } from './drivers/rs485.driver';

@Injectable()
export class HardwareService {
  private readonly logger = new Logger(HardwareService.name);

  constructor(private readonly rs485: Rs485Driver) {}

  async unlock(boardNo: number, lockNo: number): Promise<boolean> {
    this.logger.log(`Déverrouillage board=${boardNo} lock=${lockNo}`);
    return this.rs485.unlock(boardNo, lockNo);
  }

  async lock(boardNo: number, lockNo: number): Promise<boolean> {
    this.logger.log(`Verrouillage board=${boardNo} lock=${lockNo}`);
    return this.rs485.lock(boardNo, lockNo);
  }

  async health(boardNo: number): Promise<{ online: boolean }> {
    return { online: true };
  }
}