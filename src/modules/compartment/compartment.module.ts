// =============================================================================
// src/modules/compartment/compartment.module.ts
// MODULE COMPARTIMENTS — Gestion des cases individuelles
// =============================================================================

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compartment } from './compartment.entity';
import { CompartmentController } from './compartment.controller';
import { CompartmentService } from './compartment.service';
@Module({
  imports: [TypeOrmModule.forFeature([Compartment])],
  controllers: [CompartmentController],
  providers: [CompartmentService],
  exports: [CompartmentService],
})
export class CompartmentModule {}