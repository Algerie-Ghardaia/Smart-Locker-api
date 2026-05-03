// =============================================================================
// src/modules/billing/billing.service.ts
// SERVICE BILLING — Logique métier de facturation
// =============================================================================
//
// Responsabilités :
//   - CRUD des factures (MongoDB)
//   - Génération des numéros de facture (FACT-YYYY-MM-XXXX)
//   - Calcul automatique des totaux (HT, TVA, TTC)
//   - Génération de factures automatiques (abonnements)
//   - Gestion des statuts (draft → pending → paid/overdue)
//   - Traitement des paiements
//   - Statistiques de facturation
//
// =============================================================================

import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  Invoice,
  InvoiceDocument,
  InvoiceItem,
} from './schemas/invoice.schema';
import {
  InvoiceStatus,
  PaymentMethod,
} from './enums/invoice-status.enum';
import type {
  CreateInvoiceInput,
  UpdateInvoiceInput,
  PaymentInput,
  InvoiceFilterParams,
  InvoiceData,
  InvoicesResponse,
  InvoiceStats,
} from './interfaces/billing.types';

// =============================================================================
// SERVICE
// =============================================================================

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectModel(Invoice.name)
    private readonly invoiceModel: Model<InvoiceDocument>,
  ) {}

  // ===========================================================================
  // CRÉATION
  // ===========================================================================

  /**
   * Crée une nouvelle facture.
   *
   * Étapes :
   *   1. Génère le numéro de facture (FACT-YYYY-MM-XXXX)
   *   2. Calcule les totaux (subtotal, taxAmount, total)
   *   3. Crée le document MongoDB
   */
  async create(input: CreateInvoiceInput): Promise<InvoiceData> {
    // Générer le numéro de facture
    const invoiceNumber = await this.generateInvoiceNumber();

    // Calculer les totaux pour chaque ligne
    const items: InvoiceItem[] = input.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: +(item.quantity * item.unitPrice).toFixed(2),
      reference: item.reference ?? null,
      metadata: item.metadata ?? null,
    }));

    // Calculer les totaux globaux
    const subtotal = +items.reduce((sum, item) => sum + item.total, 0).toFixed(2);
    const taxRate = input.taxRate ?? 20;
    const taxAmount = +(subtotal * (taxRate / 100)).toFixed(2);
    const total = +(subtotal + taxAmount).toFixed(2);

    // Dates
    const issuedAt = new Date();
    const dueAt = input.dueAt
      ? new Date(input.dueAt)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // +30 jours

    const invoice = new this.invoiceModel({
      invoiceNumber,
      userId: input.userId,
      type: input.type,
      status: InvoiceStatus.DRAFT,
      period: input.period,
      issuedAt,
      dueAt,
      items,
      subtotal,
      taxAmount,
      taxRate,
      total,
      currency: input.currency ?? 'EUR',
      internalNotes: input.internalNotes ?? null,
      clientNotes: input.clientNotes ?? null,
    });

    const saved = await invoice.save();
    this.logger.log(`📄 Facture créée: ${invoiceNumber} — ${total}€`);

    return this.toInvoiceData(saved);
  }

  // ===========================================================================
  // LECTURE
  // ===========================================================================

  /**
   * Liste paginée des factures avec filtres.
   */
  async findAll(filters: InvoiceFilterParams): Promise<InvoicesResponse> {
    const {
      userId,
      status,
      type,
      period,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Construire le filtre MongoDB
    const query: Record<string, unknown> = {};

    if (userId) query.userId = userId;
    if (status) query.status = status;
    if (type) query.type = type;
    if (period) query.period = period;

    // Filtre par plage de dates
    if (dateFrom || dateTo) {
      query.issuedAt = {};
      if (dateFrom) query.issuedAt['$gte'] = new Date(dateFrom);
      if (dateTo) query.issuedAt['$lte'] = new Date(dateTo);
    }

    // Recherche texte
    if (search) {
      query['$or'] = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'items.description': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOrderNum = sortOrder === 'asc' ? 1 : -1;

    const [data, total, aggregation] = await Promise.all([
      this.invoiceModel
        .find(query)
        .sort({ [sortBy]: sortOrderNum })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.invoiceModel.countDocuments(query),
      this.invoiceModel
        .aggregate([
          { $match: query },
          { $group: { _id: null, totalAmount: { $sum: '$total' } } },
        ])
        .exec(),
    ]);

    const totalAmount = aggregation[0]?.totalAmount ?? 0;

    return {
      data: data.map((doc) => this.toInvoiceData(doc)),
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit) || 1,
        totalAmount: +totalAmount.toFixed(2),
      },
    };
  }

  /**
   * Trouve une facture par son ID.
   */
  async findById(invoiceId: string): Promise<InvoiceData> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    return this.toInvoiceData(invoice);
  }

  /**
   * Trouve une facture par son numéro.
   */
  async findByNumber(invoiceNumber: string): Promise<InvoiceData> {
    const invoice = await this.invoiceModel
      .findOne({ invoiceNumber })
      .exec();

    if (!invoice) {
      throw new NotFoundException(
        `Facture ${invoiceNumber} non trouvée`,
      );
    }

    return this.toInvoiceData(invoice);
  }

  /**
   * Liste les factures d'un utilisateur.
   */
  async findByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<InvoicesResponse> {
    return this.findAll({ userId, page, limit });
  }

  // ===========================================================================
  // MISE À JOUR
  // ===========================================================================

  /**
   * Met à jour une facture (statut, notes).
   */
  async update(
    invoiceId: string,
    input: UpdateInvoiceInput,
  ): Promise<InvoiceData> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    // Validation des transitions de statut
    if (input.status) {
      this.validateStatusTransition(invoice.status, input.status);
      invoice.status = input.status;

      // Si passage au statut PAYÉ, enregistrer la date
      if (input.status === InvoiceStatus.PAID) {
        invoice.paidAt = new Date();
      }
    }

    if (input.internalNotes !== undefined) {
      invoice.internalNotes = input.internalNotes;
    }

    if (input.clientNotes !== undefined) {
      invoice.clientNotes = input.clientNotes;
    }

    const updated = await invoice.save();
    this.logger.log(`📝 Facture mise à jour: ${updated.invoiceNumber}`);

    return this.toInvoiceData(updated);
  }

  // ===========================================================================
  // PAIEMENT
  // ===========================================================================

// 

/**
 * Enregistre un paiement pour une facture.
 */
async processPayment(input: PaymentInput): Promise<InvoiceData> {
  const invoice = await this.invoiceModel.findById(input.invoiceId).exec();

  if (!invoice) {
    throw new NotFoundException('Facture non trouvée');
  }

  // Vérifier que la facture est en attente ou en retard
  if (
    invoice.status !== InvoiceStatus.PENDING &&
    invoice.status !== InvoiceStatus.OVERDUE
  ) {
    throw new BadRequestException(
      `Impossible de payer une facture au statut "${invoice.status}"`,
    );
  }

  // Vérifier le montant (tolérance de 0.01€ pour les arrondis)
  if (Math.abs(input.amount - invoice.total) > 0.01) {
    throw new BadRequestException(
      `Le montant du paiement (${input.amount.toFixed(2)}€) ne correspond pas ` +
      `au total de la facture (${invoice.total.toFixed(2)}€)`,
    );
  }

  // Enregistrer le paiement
  invoice.status = InvoiceStatus.PAID;
  invoice.paidAt = new Date();
  invoice.paymentMethod = input.paymentMethod; // ✅ CORRECTION
  invoice.transactionRef = input.transactionRef ?? null;

  const updated = await invoice.save();
  this.logger.log(
    `💰 Paiement reçu: ${updated.invoiceNumber} — ${updated.total.toFixed(2)}€ ` +
    `via ${input.paymentMethod}`,
  );

  return this.toInvoiceData(updated);
}
  // ===========================================================================
  // SUPPRESSION
  // ===========================================================================

  /**
   * Supprime une facture (uniquement si elle est en brouillon).
   */
  async delete(invoiceId: string): Promise<{ message: string }> {
    const invoice = await this.invoiceModel.findById(invoiceId).exec();

    if (!invoice) {
      throw new NotFoundException('Facture non trouvée');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException(
        'Seules les factures en brouillon peuvent être supprimées',
      );
    }

    await this.invoiceModel.findByIdAndDelete(invoiceId);
    this.logger.log(`🗑️  Facture supprimée: ${invoice.invoiceNumber}`);

    return { message: 'Facture supprimée' };
  }

  // ===========================================================================
  // STATISTIQUES
  // ===========================================================================

  /**
   * Statistiques de facturation.
   */
  async getStats(userId?: string): Promise<InvoiceStats> {
    const match: Record<string, unknown> = {};
    if (userId) match.userId = userId;

    const aggregation = await this.invoiceModel.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$total' },
        },
      },
    ]).exec();

    const byStatus = {} as Record<string, number>;
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;

    aggregation.forEach(({ _id, count, totalAmount }) => {
      byStatus[_id] = count;
      totalInvoiced += totalAmount;
      if (_id === InvoiceStatus.PAID) totalPaid += totalAmount;
      if (_id === InvoiceStatus.PENDING) totalPending += totalAmount;
      if (_id === InvoiceStatus.OVERDUE) totalOverdue += totalAmount;
    });

    return {
      totalInvoiced: +totalInvoiced.toFixed(2),
      totalPaid: +totalPaid.toFixed(2),
      totalPending: +totalPending.toFixed(2),
      totalOverdue: +totalOverdue.toFixed(2),
      byStatus: byStatus as Record<string, number>,
      byPeriod: {} as Record<string, number>, // Simplifié
    };
  }

  // ===========================================================================
  // TÂCHE CRON — Mise à jour des statuts
  // ===========================================================================

  /**
   * Vérifie toutes les heures les factures en retard.
   * Passe les factures PENDING → OVERDUE si la date d'échéance est dépassée.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueInvoices(): Promise<void> {
    const result = await this.invoiceModel.updateMany(
      {
        status: InvoiceStatus.PENDING,
        dueAt: { $lt: new Date() },
      },
      { status: InvoiceStatus.OVERDUE },
    ).exec();

    if (result.modifiedCount > 0) {
      this.logger.warn(
        `⚠️  ${result.modifiedCount} facture(s) marquée(s) en retard`,
      );
    }
  }

  // ===========================================================================
  // HELPERS PRIVÉS
  // ===========================================================================

  /**
   * Génère un numéro de facture unique : FACT-YYYY-MM-XXXX
   */
  private async generateInvoiceNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `FACT-${year}-${month}`;

    // Compter les factures de ce mois
    const count = await this.invoiceModel.countDocuments({
      invoiceNumber: { $regex: `^${prefix}` },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}-${sequence}`;
  }

  /**
   * Valide les transitions de statut autorisées.
   */
  private validateStatusTransition(
    current: InvoiceStatus,
    next: InvoiceStatus,
  ): void {
    const allowedTransitions: Record<InvoiceStatus, InvoiceStatus[]> = {
      [InvoiceStatus.DRAFT]: [
        InvoiceStatus.PENDING,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.PENDING]: [
        InvoiceStatus.PAID,
        InvoiceStatus.OVERDUE,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.OVERDUE]: [
        InvoiceStatus.PAID,
        InvoiceStatus.CANCELLED,
      ],
      [InvoiceStatus.PAID]: [
        InvoiceStatus.REFUNDED,
      ],
      [InvoiceStatus.CANCELLED]: [], // Aucune transition
      [InvoiceStatus.REFUNDED]: [],  // Aucune transition
    };

    const allowed = allowedTransitions[current] ?? [];
    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Transition de statut invalide : "${current}" → "${next}"`,
      );
    }
  }

  /**
   * Convertit un document Mongoose en InvoiceData (typé).
   */
  private toInvoiceData(doc: any): InvoiceData {
    return {
      id: doc._id?.toString() ?? doc.id,
      invoiceNumber: doc.invoiceNumber,
      userId: doc.userId,
      type: doc.type,
      status: doc.status,
      period: doc.period,
      issuedAt: doc.issuedAt?.toISOString?.() ?? doc.issuedAt,
      dueAt: doc.dueAt?.toISOString?.() ?? doc.dueAt,
      paidAt: doc.paidAt?.toISOString?.() ?? doc.paidAt ?? null,
      items: doc.items?.map?.((item: any) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
        reference: item.reference ?? null,
        metadata: item.metadata ?? null,
      })) ?? [],
      subtotal: doc.subtotal,
      taxAmount: doc.taxAmount,
      taxRate: doc.taxRate,
      total: doc.total,
      currency: doc.currency,
      paymentMethod: doc.paymentMethod ?? null,
      transactionRef: doc.transactionRef ?? null,
      internalNotes: doc.internalNotes ?? null,
      clientNotes: doc.clientNotes ?? null,
      metadata: doc.metadata ?? null,
      createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
      updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
    };
  }
}