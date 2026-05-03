// =============================================================================
// src/modules/reservation/reservation.service.ts
// SERVICE RÉSERVATION — Logique métier complète (CORRIGÉ)
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual, DataSource } from 'typeorm';
import { Reservation } from './reservation.entity';
import { Compartment } from '../compartment/compartment.entity';
import { Locker } from '../locker/locker.entity';
import { CompartmentStatus } from '../../common/types/compartment-status.enum';
import { ReservationStatus } from './types/reservation-status.enum';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import { EventLogService } from '../event-log/event-log.service';
import { EventType } from '../event-log/schemas/event-log.schema';

// -----------------------------------------------------------------------------
// Tarification par taille (€/heure)
// -----------------------------------------------------------------------------

const HOURLY_RATES: Record<string, number> = {
  S: 2.0,
  M: 4.0,
  L: 6.0,
  XL: 8.0,
};

@Injectable()
export class ReservationService {
  private readonly logger = new Logger(ReservationService.name);

  constructor(
    @InjectRepository(Reservation)
    private readonly reservationRepo: Repository<Reservation>,

    @InjectRepository(Compartment)
    private readonly compartmentRepo: Repository<Compartment>,

    @InjectRepository(Locker)
    private readonly lockerRepo: Repository<Locker>,

    private readonly eventLog: EventLogService,
    private readonly dataSource: DataSource,
  ) {}

  // ===========================================================================
  // CRÉER UNE RÉSERVATION
  // ===========================================================================

  async create(dto: CreateReservationDto, userId: string): Promise<Reservation> {
    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    // 1. Valider les dates
    this.validateDates(startDate, endDate);

    // 2. Vérifier que le casier existe
    const locker = await this.lockerRepo.findOne({
      where: { id: dto.lockerId, isActive: true },
    });

    if (!locker) {
      throw new NotFoundException('Casier non trouvé ou inactif');
    }

    // 3. Vérifier la disponibilité
    // ✅ CORRECTION : Passer le size comme string, pas comme enum
    const hasConflict = await this.checkAvailability(
      dto.lockerId,
      dto.requestedSize,
      startDate,
      endDate,
    );

    if (hasConflict) {
      throw new ConflictException(
        `Aucune case disponible en taille ${dto.requestedSize} pour cette période`,
      );
    }

    // 4. Calculer le prix
    const durationHours = this.calculateDuration(startDate, endDate);
    const hourlyRate = HOURLY_RATES[dto.requestedSize] || 4.0;
    const totalPrice = Math.round(durationHours * hourlyRate * 100) / 100;

    // 5. Trouver et attribuer une case disponible
    const compartment = await this.findAvailableCompartment(
      dto.lockerId,
      dto.requestedSize,
    );

    // 6. Créer la réservation
    const reservation = this.reservationRepo.create({
      userId,
      lockerId: dto.lockerId,
      compartmentId: compartment?.id || null,
      requestedSize: dto.requestedSize,
      startDate,
      endDate,
      totalPrice,
      notes: dto.notes,
      status: ReservationStatus.CONFIRMED,
    });

    const saved = await this.reservationRepo.save(reservation);

    // 7. Mettre à jour le statut de la case
    if (compartment) {
      compartment.status = CompartmentStatus.RESERVED;
      await this.compartmentRepo.save(compartment);
    }

    // 8. Logger l'événement
    await this.eventLog.create({
      type: EventType.COMPARTMENT_STATUS_CHANGE,
      lockerId: dto.lockerId,
      shelfNo: compartment?.shelfNo || 'N/A',
      parcelId: null,
      userId,
      metadata: {
        action: 'reservation_created',
        reservationId: saved.id,
        size: dto.requestedSize,
        totalPrice,
        durationHours,
      },
    });

    this.logger.log(`✅ Réservation créée: ${saved.id} - ${dto.requestedSize} - ${totalPrice}€`);

    return saved;
  }

  // ===========================================================================
  // LIRE LES RÉSERVATIONS
  // ===========================================================================

  async findByUser(
    userId: string,
    options?: { status?: ReservationStatus; page?: number; limit?: number },
  ): Promise<{ data: Reservation[]; meta: any }> {
    const { status, page = 1, limit = 20 } = options || {};

    const where: any = { userId };
    if (status) where.status = status;

    const [data, total] = await this.reservationRepo.findAndCount({
      where,
      relations: ['locker', 'compartment'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByLocker(
    lockerId: string,
    options?: { status?: ReservationStatus; date?: Date },
  ): Promise<Reservation[]> {
    const where: any = { lockerId };
    if (options?.status) where.status = options.status;

    if (options?.date) {
      where.startDate = LessThanOrEqual(options.date);
      where.endDate = MoreThanOrEqual(options.date);
    }

    return this.reservationRepo.find({
      where,
      relations: ['user', 'compartment'],
      order: { startDate: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Reservation> {
    const reservation = await this.reservationRepo.findOne({
      where: { id },
      relations: ['user', 'locker', 'compartment'],
    });

    if (!reservation) {
      throw new NotFoundException('Réservation non trouvée');
    }

    return reservation;
  }

  // ===========================================================================
  // METTRE À JOUR
  // ===========================================================================

  async update(id: string, dto: UpdateReservationDto, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.userId !== userId) {
      throw new BadRequestException('Vous ne pouvez modifier que vos propres réservations');
    }

    if (
      reservation.status === ReservationStatus.COMPLETED ||
      reservation.status === ReservationStatus.CANCELLED ||
      reservation.status === ReservationStatus.EXPIRED
    ) {
      throw new BadRequestException('Cette réservation ne peut plus être modifiée');
    }

    if (dto.startDate) reservation.startDate = new Date(dto.startDate);
    if (dto.endDate) reservation.endDate = new Date(dto.endDate);
    if (dto.notes !== undefined) reservation.notes = dto.notes;
    if (dto.status) reservation.status = dto.status;

    const updated = await this.reservationRepo.save(reservation);
    this.logger.log(`✅ Réservation mise à jour: ${updated.id}`);

    return updated;
  }

  // ===========================================================================
  // ANNULER
  // ===========================================================================

  async cancel(id: string, userId: string): Promise<Reservation> {
    const reservation = await this.findOne(id);

    if (reservation.userId !== userId) {
      throw new BadRequestException('Vous ne pouvez annuler que vos propres réservations');
    }

    if (
      reservation.status === ReservationStatus.COMPLETED ||
      reservation.status === ReservationStatus.CANCELLED
    ) {
      throw new BadRequestException('Cette réservation est déjà terminée ou annulée');
    }

    reservation.status = ReservationStatus.CANCELLED;
    const saved = await this.reservationRepo.save(reservation);

    await this.releaseCompartment(reservation.compartmentId);

    this.logger.log(`❌ Réservation annulée: ${saved.id}`);
    return saved;
  }

  // ===========================================================================
  // VÉRIFIER LA DISPONIBILITÉ
  // ===========================================================================

  /**
   * Vérifie si une taille de case est disponible pour une période donnée.
   * Retourne true si conflit (pas disponible), false si disponible.
   */
  async checkAvailability(
    lockerId: string,
    size: string,  // ✅ Changé en string pour compatibilité
    startDate: Date,
    endDate: Date,
  ): Promise<boolean> {
    const totalCompartments = await this.compartmentRepo.count({
      where: { lockerId, size: size as any },  // ✅ Cast pour éviter l'erreur TypeScript
    });

    if (totalCompartments === 0) return true; // Aucune case de cette taille = conflit

    const overlappingReservations = await this.reservationRepo.count({
      where: {
        lockerId,
        requestedSize: size as any,  // ✅ Cast pour éviter l'erreur TypeScript
        status: ReservationStatus.CONFIRMED,
        startDate: LessThanOrEqual(endDate),
        endDate: MoreThanOrEqual(startDate),
      },
    });

    return overlappingReservations >= totalCompartments;
  }

  // ===========================================================================
  // HELPERS PRIVÉS
  // ===========================================================================

private validateDates(startDate: Date, endDate: Date): void {
  const now = new Date();
  
  // ✅ Tolérance de 5 minutes (décalage horaire, latence réseau)
  const toleranceMs = 5 * 60 * 1000;
  const minStart = new Date(now.getTime() - toleranceMs);

  if (startDate < minStart) {
    throw new BadRequestException('La date de début doit être dans le futur');
  }

  if (endDate <= startDate) {
    throw new BadRequestException('La date de fin doit être après la date de début');
  }

  const maxDuration = 7 * 24 * 60 * 60 * 1000;
  if (endDate.getTime() - startDate.getTime() > maxDuration) {
    throw new BadRequestException('La durée maximale de réservation est de 7 jours');
  }
}

  private calculateDuration(startDate: Date, endDate: Date): number {
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60));
  }

  private async findAvailableCompartment(
    lockerId: string,
    size: string,
  ): Promise<Compartment | null> {
    return this.compartmentRepo.findOne({
      where: { lockerId, size: size as any, status: CompartmentStatus.AVAILABLE },
      order: { shelfNo: 'ASC' },
    });
  }

  private async releaseCompartment(compartmentId: string | null): Promise<void> {
    if (!compartmentId) return;

    await this.compartmentRepo.update(compartmentId, {
      status: CompartmentStatus.AVAILABLE,
    });
  }
}