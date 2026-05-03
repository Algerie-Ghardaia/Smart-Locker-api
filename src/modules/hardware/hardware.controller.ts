// =============================================================================
// src/modules/hardware/hardware.controller.ts
// CONTROLLER HARDWARE — Endpoints de contrôle des serrures
// =============================================================================

import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { HardwareService } from './hardware.service';
import { UnlockDto } from './dto/unlock.dto';

@Controller('hardware')
export class HardwareController {
  constructor(private readonly hardwareService: HardwareService) {}

  @Post('unlock')
  async unlock(@Body() dto: UnlockDto) {
    return this.hardwareService.unlock(dto.boardNo, dto.lockNo);
  }

  @Get(':boardNo/health')
  async health(@Param('boardNo') boardNo: string) {
    return this.hardwareService.health(parseInt(boardNo, 10));
  }
}