// =============================================================================
// src/modules/billing/enums/invoice-status.enum.ts
// ENUM — Statuts de facture
// =============================================================================

export enum InvoiceStatus {
  /** Brouillon — non envoyée au client */
  DRAFT = 'draft',
  /** Envoyée — en attente de paiement */
  PENDING = 'pending',
  /** Payée — paiement reçu */
  PAID = 'paid',
  /** En retard — date d'échéance dépassée */
  OVERDUE = 'overdue',
  /** Annulée — facture annulée */
  CANCELLED = 'cancelled',
  /** Remboursée — paiement remboursé */
  REFUNDED = 'refunded',
}

export enum PaymentMethod {
  CREDIT_CARD = 'credit_card',
  BANK_TRANSFER = 'bank_transfer',
  DIRECT_DEBIT = 'direct_debit',
  PAYPAL = 'paypal',
  STRIPE = 'stripe',
}

export enum BillingPeriod {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
}

export enum InvoiceType {
  SUBSCRIPTION = 'subscription',
  USAGE = 'usage',
  DEPOSIT = 'deposit',
  REFUND = 'refund',
  CREDIT_NOTE = 'credit_note',
}