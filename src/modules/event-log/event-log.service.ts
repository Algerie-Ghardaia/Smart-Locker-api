// =============================================================================
// src/modules/event-log/event-log.service.ts
// SERVICE LOGS — Gestion complète des événements (MongoDB)
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, QueryFilter } from 'mongoose';


import {
  EventLog,
  EventLogDocument,
  EventType,
} from './schemas/event-log.schema';
import { getErrorMessage } from '../../common/helpers/getErrorMessage.helper';

// -----------------------------------------------------------------------------
// DTO pour la création d'événement
// -----------------------------------------------------------------------------

export interface CreateEventLogDto {
  type: EventType;
  lockerId: string;
  shelfNo: string;
  parcelId?: string;
  userId?: string;
  username?: string;
  metadata?: Record<string, any>;
}

// -----------------------------------------------------------------------------
// Options de recherche
// -----------------------------------------------------------------------------

export interface FindEventLogsOptions {
  page?: number;
  limit?: number;
  type?: EventType;
  lockerId?: string;
  parcelId?: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  sortOrder?: 'asc' | 'desc';
}

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

@Injectable()
export class EventLogService {
  private readonly logger = new Logger(EventLogService.name);

  constructor(
    @InjectModel(EventLog.name)
    private readonly eventLogModel: Model<EventLogDocument>,
  ) {}

  // ===========================================================================
  // CRÉATION
  // ===========================================================================

  /**
   * Crée une entrée dans le journal d'événements.
   * Ne lève pas d'exception pour ne pas bloquer l'opération principale.
   */
  async create(dto: CreateEventLogDto): Promise<EventLogDocument | null> {
    try {
      const eventLog = new this.eventLogModel({
        type: dto.type,
        lockerId: dto.lockerId,
        shelfNo: dto.shelfNo,
        parcelId: dto.parcelId,
        userId: dto.userId,
        username: dto.username,
        metadata: dto.metadata || {},
      });

      const saved = await eventLog.save();

      this.logger.debug(
        `📝 [${dto.type}] Locker: ${dto.lockerId} | Shelf: ${dto.shelfNo} | User: ${dto.username || dto.userId || 'System'}`,
      );

      return saved;
    } catch (error) {
      // Ne pas bloquer l'opération principale si le log échoue
      this.logger.error(
        `❌ Failed to create event log: ${getErrorMessage(error)}`,
      );

      return null;
    }
  }

  /**
   * Crée plusieurs événements en lot.
   */
  async createMany(dtos: CreateEventLogDto[]): Promise<number> {
    try {
      const result = await this.eventLogModel.insertMany(
        dtos.map((dto) => ({
          ...dto,
          metadata: dto.metadata || {},
        })),
        { ordered: false }, // Continue même si certains échouent
      );

      this.logger.debug(`📝 Batch insert: ${result.length} events logged`);
      return result.length;
    } catch (error) {
      this.logger.error(`❌ Batch insert failed: ${getErrorMessage(error)}`);

      return 0;
    }
  }

  // ===========================================================================
  // RECHERCHE
  // ===========================================================================

  /**
   * Recherche paginée avec filtres.
   */
  async findAll(options: FindEventLogsOptions = {}) {
    const {
      page = 1,
      limit = 50,
      type,
      lockerId,
      parcelId,
      userId,
      startDate,
      endDate,
      sortOrder = 'desc',
    } = options;

    // Construire le filtre
    const filter: QueryFilter<EventLogDocument> = {};

    if (type) filter.type = type;
    if (lockerId) filter.lockerId = lockerId;
    if (parcelId) filter.parcelId = parcelId;
    if (userId) filter.userId = userId;

    // Filtre par date
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = startDate;
      if (endDate) filter.createdAt.$lte = endDate;
    }

    const skip = (page - 1) * limit;

    // Exécuter les requêtes en parallèle
    const [data, total] = await Promise.all([
      this.eventLogModel
        .find(filter)
        .sort({ createdAt: sortOrder === 'desc' ? -1 : 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.eventLogModel.countDocuments(filter).exec(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    };
  }

  /**
   * Récupère les événements d'un casier spécifique.
   */
  async findByLocker(
    lockerId: string,
    options?: { limit?: number; type?: EventType },
  ): Promise<EventLogDocument[]> {
    const { limit = 100, type } = options || {};

    const filter: QueryFilter<EventLogDocument> = { lockerId };
    if (type) filter.type = type;

    return this.eventLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  /**
   * Récupère les événements liés à un colis.
   */
  async findByParcel(parcelId: string): Promise<EventLogDocument[]> {
    return this.eventLogModel
      .find({ parcelId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Récupère l'activité d'un utilisateur.
   */
  async findByUser(
    userId: string,
    options?: { limit?: number; type?: EventType },
  ): Promise<EventLogDocument[]> {
    const { limit = 50, type } = options || {};

    const filter: QueryFilter<EventLogDocument> = { userId };
    if (type) filter.type = type;

    return this.eventLogModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  }

  // ===========================================================================
  // STATISTIQUES
  // ===========================================================================

  /**
   * Statistiques par type d'événement pour une période donnée.
   */
  async getStats(options: {
    lockerId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<Record<EventType, number>> {
    const { lockerId, startDate, endDate } = options;

    const matchFilter: any = {};
    if (lockerId) matchFilter.lockerId = lockerId;
    if (startDate || endDate) {
      matchFilter.createdAt = {};
      if (startDate) matchFilter.createdAt.$gte = startDate;
      if (endDate) matchFilter.createdAt.$lte = endDate;
    }

    const result = await this.eventLogModel
      .aggregate([
        { $match: matchFilter },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ])
      .exec();

    // Initialiser tous les types à 0
    const stats: Record<EventType, number> = Object.values(EventType).reduce(
      (acc, type) => ({ ...acc, [type]: 0 }),
      {} as Record<EventType, number>,
    );

    // Remplir avec les résultats
    result.forEach((item: { _id: EventType; count: number }) => {
      stats[item._id] = item.count;
    });

    return stats;
  }

  /**
   * Récupère le dernier événement d'un casier.
   */
  async getLastEvent(lockerId: string): Promise<EventLogDocument | null> {
    return this.eventLogModel
      .findOne({ lockerId })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  // ===========================================================================
  // NETTOYAGE
  // ===========================================================================

  /**
   * Supprime les logs plus vieux qu'un certain nombre de jours.
   */
  async cleanup(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await this.eventLogModel
      .deleteMany({
        createdAt: { $lt: cutoffDate },
      })
      .exec();

    this.logger.log(
      `🧹 Cleaned up ${result.deletedCount} event logs (older than ${daysToKeep} days)`,
    );

    return result.deletedCount || 0;
  }

  /**
   * Supprime tous les logs d'un casier.
   */
  async deleteByLocker(lockerId: string): Promise<number> {
    const result = await this.eventLogModel.deleteMany({ lockerId }).exec();
    this.logger.log(
      `🗑️ Deleted ${result.deletedCount} logs for locker: ${lockerId}`,
    );
    return result.deletedCount || 0;
  }
}
