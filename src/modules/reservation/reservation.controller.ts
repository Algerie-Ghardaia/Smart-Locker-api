// =============================================================================
// src/modules/reservation/reservation.controller.ts
// CONTROLLER RÉSERVATION — Endpoints REST complets
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { ReservationStatus } from './types/reservation-status.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/types/role.enum';
import type { AuthenticatedUser } from '../auth/auth.types';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@ApiTags('Reservations')
@Controller('reservations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  // ===========================================================================
  // POST /reservations (Tous les utilisateurs authentifiés)
  // ===========================================================================

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle réservation' })
  @ApiResponse({ status: 201, description: 'Réservation créée' })
  @ApiResponse({ status: 400, description: 'Dates invalides' })
  @ApiResponse({ status: 409, description: 'Aucune case disponible' })
  async create(
    @Body() dto: CreateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationService.create(dto, user.id);
  }

  // ===========================================================================
  // GET /reservations (Utilisateur connecté)
  // ===========================================================================

  @Get()
  @ApiOperation({ summary: 'Mes réservations' })
  @ApiQuery({ name: 'status', required: false, enum: ReservationStatus })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  async findMyReservations(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: ReservationStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.reservationService.findByUser(user.id, {
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // ===========================================================================
  // GET /reservations/:id
  // ===========================================================================

  @Get(':id')
  @ApiOperation({ summary: "Détail d'une réservation" })
  @ApiResponse({ status: 404, description: 'Réservation non trouvée' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.reservationService.findOne(id);
  }

  // ===========================================================================
  // GET /reservations/locker/:lockerId (Admin, Opérateur)
  // ===========================================================================

  @Get('locker/:lockerId')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({ summary: "Réservations d'un casier (admin/opérateur)" })
  async findByLocker(
    @Param('lockerId', ParseUUIDPipe) lockerId: string,
    @Query('date') date?: string,
  ) {
    return this.reservationService.findByLocker(lockerId, {
      date: date ? new Date(date) : undefined,
    });
  }

  // ===========================================================================
  // PATCH /reservations/:id
  // ===========================================================================

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une réservation' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReservationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationService.update(id, dto, user.id);
  }

  // ===========================================================================
  // POST /reservations/:id/cancel
  // ===========================================================================

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Annuler une réservation' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.reservationService.cancel(id, user.id);
  }

  // ===========================================================================
  // GET /reservations/check-availability
  // ===========================================================================

  @Get('check-availability/:lockerId')
  @ApiOperation({ summary: 'Vérifier la disponibilité' })
  @ApiQuery({ name: 'size', required: true, example: 'M' })
  @ApiQuery({
    name: 'startDate',
    required: true,
    example: '2026-05-01T10:00:00.000Z',
  })
  @ApiQuery({
    name: 'endDate',
    required: true,
    example: '2026-05-01T18:00:00.000Z',
  })
  async checkAvailability(
    @Param('lockerId', ParseUUIDPipe) lockerId: string,
    @Query('size') size: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const hasConflict = await this.reservationService.checkAvailability(
      lockerId,
      size,
      new Date(startDate),
      new Date(endDate),
    );

    return { available: !hasConflict };
  }
}
