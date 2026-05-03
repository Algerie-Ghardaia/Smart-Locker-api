// =============================================================================
// src/modules/notification/notification.service.ts
//
// SERVICE NOTIFICATIONS — SMS + In-app (MongoDB)
//
// Responsabilités :
//   1. CRUD notifications in-app (MongoDB)
//   2. Envoi SMS asynchrone via Bull queue (Twilio + Vonage fallback)
//   3. Compteurs et marquage lu / non lu
//
// Architecture :
//   - Les méthodes retournent le payload brut — le TransformInterceptor global
//     se charge de l'envelopper dans { success, data, timestamp, path }.
//   - Les erreurs sont gérées par le HttpExceptionFilter global.
//   - L'envoi SMS est non-bloquant (Bull queue) — ne ralentit pas la réponse HTTP.
//
// Coordination frontend :
//   findByUser()  → { data: Notification[], meta: PaginationMeta }
//   countUnread() → number  (controller retourne { count: number })
//   markAsRead()  → Notification
//   markAllAsRead() → { marked: number }
//   delete()      → { message: string }
// =============================================================================

import {
  Injectable,
  Logger,
  NotFoundException,
}                          from '@nestjs/common';
import { InjectQueue }     from '@nestjs/bull';
import { InjectModel }     from '@nestjs/mongoose';
import { Model }           from 'mongoose';
import { Queue }           from 'bull';
import {
  Notification,
  NotificationDocument,
  NotificationType,
}                          from './schemas/notification.schema';

// =============================================================================
// SECTION 1 — TYPES INTERNES
// =============================================================================

/** Payload pour créer une notification in-app */
interface CreateNotificationInput {
  userId:    string;
  type:      NotificationType;
  title:     string;
  message:   string;
  link?:     string;
  metadata?: Record<string, unknown>;
}

/** Payload pour l'envoi d'un SMS de code de retrait */
interface PickupCodeSmsData {
  phone:     string;
  name?:     string;
  code:      string;
  shelf:     string;
  expiresAt: Date;
}

/** Métadonnées de pagination retournées avec les listes */
export interface PaginationMeta {
  total:  number;
  unread: number;
  page:   number;
  limit:  number;
  pages:  number;
}

// =============================================================================
// SECTION 2 — SERVICE
// =============================================================================

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectQueue('sms')
    private readonly smsQueue: Queue,

    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  // ---------------------------------------------------------------------------
  // SMS — Envoi asynchrone via Bull queue
  // ---------------------------------------------------------------------------

  /**
   * sendPickupCode
   *
   * Enfile un job Bull pour l'envoi du SMS de code de retrait.
   * L'envoi est asynchrone — la réponse HTTP n'attend pas la livraison du SMS.
   *
   * Stratégie de retry : 3 tentatives avec backoff exponentiel (5s, 10s, 20s).
   * Le SmsProcessor tente Twilio, puis Vonage en fallback.
   */
  async sendPickupCode(data: PickupCodeSmsData): Promise<void> {
    await this.smsQueue.add('send-pickup-code', data, {
      attempts:         3,
      backoff:          { type: 'exponential', delay: 5_000 },
      removeOnComplete: true,
      removeOnFail:     false,
    });

    this.logger.log(`📱 SMS en file d'attente pour ${data.phone}`);
  }

  // ---------------------------------------------------------------------------
  // IN-APP — Création
  // ---------------------------------------------------------------------------

  /**
   * create
   *
   * Crée et persiste une notification in-app dans MongoDB.
   * Appelé par les autres services (ParcelService, BillingService…) via injection.
   */
  async create(input: CreateNotificationInput): Promise<NotificationDocument> {
    const notification = new this.notificationModel({
      userId:   input.userId,
      type:     input.type,
      title:    input.title,
      message:  input.message,
      link:     input.link     ?? null,
      metadata: input.metadata ?? null,
      read:     false,
    });

    const saved = await notification.save();
    this.logger.debug(`🔔 Notification créée pour ${input.userId} : ${input.title}`);
    return saved;
  }

  // ---------------------------------------------------------------------------
  // IN-APP — Lecture
  // ---------------------------------------------------------------------------

  /**
   * findByUser
   *
   * Retourne les notifications paginées d'un utilisateur, triées par date
   * décroissante. Inclut le compteur de non-lues dans les métadonnées.
   *
   * @param userId - UUID PostgreSQL de l'utilisateur
   * @param page   - Page courante (1-indexed)
   * @param limit  - Nombre d'éléments par page
   */
  async findByUser(
    userId: string,
    page:   number,
    limit:  number,
  ): Promise<{ data: NotificationDocument[]; meta: PaginationMeta }> {
    const skip = (page - 1) * limit;

    // Trois requêtes parallèles pour minimiser la latence MongoDB
    const [data, total, unread] = await Promise.all([
      this.notificationModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.notificationModel.countDocuments({ userId }),
      this.notificationModel.countDocuments({ userId, read: false }),
    ]);

    return {
      data: data as NotificationDocument[],
      meta: {
        total,
        unread,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * countUnread
   *
   * Retourne le nombre de notifications non lues pour un utilisateur.
   * Utilisé par l'endpoint de polling GET /notifications/unread/count.
   */
  async countUnread(userId: string): Promise<number> {
    return this.notificationModel.countDocuments({ userId, read: false });
  }

  // ---------------------------------------------------------------------------
  // IN-APP — Marquage
  // ---------------------------------------------------------------------------

  /**
   * markAsRead
   *
   * Marque une notification individuelle comme lue.
   * Vérifie que la notification appartient bien à l'utilisateur (userId + _id).
   *
   * @throws NotFoundException si la notification est introuvable ou appartient à un autre user
   */
  async markAsRead(
    userId:         string,
    notificationId: string,
  ): Promise<NotificationDocument> {
    const notification = await this.notificationModel.findOneAndUpdate(
      { _id: notificationId, userId },
      { read: true },
      { new: true },
    );

    if (!notification) {
      throw new NotFoundException('Notification non trouvée');
    }

    return notification;
  }

  /**
   * markAllAsRead
   *
   * Marque toutes les notifications non lues d'un utilisateur comme lues.
   * Retourne le nombre de documents modifiés.
   */
  async markAllAsRead(userId: string): Promise<{ marked: number }> {
    const result = await this.notificationModel.updateMany(
      { userId, read: false },
      { read: true },
    );

    return { marked: result.modifiedCount };
  }

  // ---------------------------------------------------------------------------
  // IN-APP — Suppression
  // ---------------------------------------------------------------------------

  /**
   * delete
   *
   * Supprime définitivement une notification.
   * Vérifie l'appartenance à l'utilisateur avant suppression.
   *
   * @throws NotFoundException si la notification est introuvable
   */
  async delete(
    userId:         string,
    notificationId: string,
  ): Promise<{ message: string }> {
    const result = await this.notificationModel.findOneAndDelete({
      _id: notificationId,
      userId,
    });

    if (!result) {
      throw new NotFoundException('Notification non trouvée');
    }

    return { message: 'Notification supprimée' };
  }
}