// =============================================================================
// src/modules/compartment/compartment.controller.ts
// CONTROLLER COMPARTIMENTS — Gestion des cases
// =============================================================================

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { CompartmentService } from './compartment.service';
import { Role } from '../../common/types/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CompartmentDto } from './dto/compartment.dto';

@Controller('compartments')
export class CompartmentController {
  constructor(private readonly compartmentService: CompartmentService) {}

  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR)
  findAll() {
    return this.compartmentService.findAll();
  }

  @Get('locker/:lockerId')
  @Roles(Role.ADMIN, Role.OPERATOR)
  findByLocker(@Param('lockerId') lockerId: string) {
    return this.compartmentService.findByLocker(lockerId);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CompartmentDto) {
    return this.compartmentService.create(dto);
  }

  @Post(':id/maintenance')
  @Roles(Role.ADMIN, Role.OPERATOR)
  setMaintenance(@Param('id') id: string) {
    return this.compartmentService.setMaintenance(id);
  }

  @Post(':id/available')
  @Roles(Role.ADMIN, Role.OPERATOR)
  setAvailable(@Param('id') id: string) {
    return this.compartmentService.setAvailable(id);
  }
}