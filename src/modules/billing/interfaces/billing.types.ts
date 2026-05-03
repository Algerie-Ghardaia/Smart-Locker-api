// =============================================================================
// src/modules/billing/interfaces/billing.types.ts
// TYPES BILLING — Source unique de vérité pour tous les types
// =============================================================================

import {
  InvoiceStatus,
  PaymentMethod,
  BillingPeriod,
  InvoiceType,
} from '../enums/invoice-status.enum';

// -----------------------------------------------------------------------------
// Facture
// -----------------------------------------------------------------------------

export interface InvoiceData {
  /** ID unique de la facture (MongoDB ObjectId) */
  id: string;
  /** Numéro de facture formaté : FACT-YYYY-MM-XXXX */
  invoiceNumber: string;
  /** ID de l'utilisateur (clé étrangère PostgreSQL) */
  userId: string;
  /** Type de facture */
  type: InvoiceType;
  /** Statut actuel */
  status: InvoiceStatus;
  /** Période de facturation */
  period: BillingPeriod;
  /** Date d'émission */
  issuedAt: string;
  /** Date d'échéance */
  dueAt: string;
  /** Date de paiement (si payée) */
  paidAt?: string | null;
  /** Lignes de la facture */
  items: InvoiceItem[];
  /** Sous-total HT (avant taxes) */
  subtotal: number;
  /** Montant de la TVA */
  taxAmount: number;
  /** Taux de TVA appliqué (ex: 20) */
  taxRate: number;
  /** Montant total TTC */
  total: number;
  /** Devise (EUR, USD...) */
  currency: string;
  /** Méthode de paiement utilisée */
  paymentMethod?: PaymentMethod | null;
  /** Référence de transaction externe (Stripe, PayPal...) */
  transactionRef?: string | null;
  /** Notes internes (visibles uniquement par les admins) */
  internalNotes?: string | null;
  /** Notes client (visibles sur la facture PDF) */
  clientNotes?: string | null;
  /** Métadonnées additionnelles */
  metadata?: Record<string, unknown> | null;
  /** Timestamps Mongoose */
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  /** Description de l'article */
  description: string;
  /** Quantité */
  quantity: number;
  /** Prix unitaire HT */
  unitPrice: number;
  /** Montant total HT pour cette ligne */
  total: number;
  /** Référence optionnelle (ex: ID de réservation) */
  reference?: string;
  /** Métadonnées additionnelles */
  metadata?: Record<string, unknown>;
}

// -----------------------------------------------------------------------------
// Réponses paginées
// -----------------------------------------------------------------------------

export interface InvoicesResponse {
  data: InvoiceData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
    totalAmount: number;
  };
}

export interface InvoiceStats {
  totalInvoiced: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
  byStatus: Record<InvoiceStatus, number>;
  byPeriod: Record<BillingPeriod, number>;
}

// -----------------------------------------------------------------------------
// DTOs
// -----------------------------------------------------------------------------

export interface CreateInvoiceInput {
  userId: string;
  type: InvoiceType;
  period: BillingPeriod;
  items: Omit<InvoiceItem, 'total'>[];
  taxRate?: number;
  currency?: string;
  dueAt?: string;
  clientNotes?: string;
  internalNotes?: string;
}

export interface UpdateInvoiceInput {
  status?: InvoiceStatus;
  clientNotes?: string;
  internalNotes?: string;
}

export interface PaymentInput {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  transactionRef?: string;
}

export interface InvoiceFilterParams {
  userId?: string;
  status?: InvoiceStatus;
  type?: InvoiceType;
  period?: BillingPeriod;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// -----------------------------------------------------------------------------
// Réponses API
// -----------------------------------------------------------------------------

export interface InvoiceResponse {
  invoice: InvoiceData;
}

export interface PaymentResponse {
  invoice: InvoiceData;
  payment: {
    amount: number;
    method: PaymentMethod;
    transactionRef: string;
    paidAt: string;
  };
}
