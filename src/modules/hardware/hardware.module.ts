// =============================================================================
// src/modules/hardware/hardware.module.ts
// MODULE HARDWARE — Communication avec les serrures physiques
// =============================================================================

import { Module } from '@nestjs/common';
import { HardwareController } from './hardware.controller';
import { HardwareService } from './hardware.service';
import { Rs485Driver } from './drivers/rs485.driver';
import { HttpBoardDriver } from './drivers/http-board.driver';
@Module({
  controllers: [HardwareController],
  providers: [HardwareService, Rs485Driver, HttpBoardDriver],
  exports: [HardwareService],
})
export class HardwareModule {}