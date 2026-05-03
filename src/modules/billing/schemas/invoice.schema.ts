// =============================================================================
// src/modules/billing/schemas/invoice.schema.ts
// SCHEMA MONGOOSE — Factures
// =============================================================================
//
// Stocké dans MongoDB (collection "invoices").
// userId fait référence à la table users PostgreSQL.
// =============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import {
  InvoiceStatus,
  PaymentMethod,
  BillingPeriod,
  InvoiceType,
} from '../enums/invoice-status.enum';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type InvoiceDocument = Invoice & Document;

// -----------------------------------------------------------------------------
// Schéma Item (sous-document)
// -----------------------------------------------------------------------------

@Schema({ _id: false })
export class InvoiceItem {
  @Prop({ required: true })
  description: string;

  @Prop({ required: true, min: 1 })
  quantity: number;

  @Prop({ required: true, min: 0 })
  unitPrice: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ type: String, default: null })
  reference?: string | null;

  @Prop({ type: Object, default: null })
  metadata?: Record<string, unknown> | null;
}

// -----------------------------------------------------------------------------
// Schéma Invoice
// -----------------------------------------------------------------------------

@Schema({
  timestamps: true,
  collection: 'invoices',
  toJSON: {
    virtuals: true,
    transform: (_doc, ret) => {
      ret._id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
})
export class Invoice {
  @Prop({ required: true, unique: true, index: true })
  invoiceNumber: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({
    required: true,
    enum: InvoiceType,
    default: InvoiceType.SUBSCRIPTION,
  })
  type: InvoiceType;

  @Prop({
    required: true,
    enum: InvoiceStatus,
    default: InvoiceStatus.DRAFT,
    index: true,
  })
  status: InvoiceStatus;

  @Prop({
    required: true,
    enum: BillingPeriod,
    default: BillingPeriod.MONTHLY,
  })
  period: BillingPeriod;

  @Prop({ required: true })
  issuedAt: Date;

  @Prop({ required: true, index: true })
  dueAt: Date;

  @Prop({ type: Date, default: null })
  paidAt: Date | null;

  @Prop({ type: [InvoiceItem], required: true })
  items: InvoiceItem[];

  @Prop({ required: true, min: 0 })
  subtotal: number;

  @Prop({ required: true, min: 0 })
  taxAmount: number;

  @Prop({ required: true, min: 0, max: 100, default: 20 })
  taxRate: number;

  @Prop({ required: true, min: 0 })
  total: number;

  @Prop({ required: true, default: 'EUR', maxlength: 3 })
  currency: string;

  @Prop({
    type: String,
    enum: PaymentMethod,
    default: null,
  })
  paymentMethod: PaymentMethod | null;

  @Prop({ type: String, default: null })
  transactionRef: string | null;

  @Prop({ type: String, default: null, maxlength: 2000 })
  internalNotes: string | null;

  @Prop({ type: String, default: null, maxlength: 2000 })
  clientNotes: string | null;

  @Prop({ type: Object, default: null })
  metadata: Record<string, unknown> | null;
}

// -----------------------------------------------------------------------------
// Schéma + Index
// -----------------------------------------------------------------------------

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// Index composés pour les requêtes fréquentes
InvoiceSchema.index({ userId: 1, status: 1, createdAt: -1 });
InvoiceSchema.index({ userId: 1, dueAt: 1 });
InvoiceSchema.index({ status: 1, dueAt: 1 }); // Pour trouver les factures en retard
InvoiceSchema.index({ invoiceNumber: 'text' }); // Recherche texte