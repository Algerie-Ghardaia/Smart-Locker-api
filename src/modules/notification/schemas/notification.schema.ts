// =============================================================================
// src/modules/notification/schemas/notification.schema.ts
//
// SCHEMA MONGOOSE — Notifications in-app
//
// Stockage : MongoDB, collection "notifications"
// Lien avec PostgreSQL : userId = UUID de la table users (string)
//
// Index :
//   Un seul index composé couvre tous les cas d'usage courants :
//   { userId, read, createdAt } → requêtes fréquentes (findByUser, countUnread)
//
//   ⚠️  L'index simple @Prop({ index: true }) sur userId a été SUPPRIMÉ.
//       Il causait un warning Mongoose "Duplicate schema index" car l'index
//       composé couvre déjà userId en préfixe (règle des index préfixe MongoDB).
// =============================================================================

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document }                    from 'mongoose';

// =============================================================================
// TYPES
// =============================================================================

export type NotificationDocument = Notification & Document;

export enum NotificationType {
  RESERVATION = 'reservation',
  PARCEL      = 'parcel',
  BILLING     = 'billing',
  SYSTEM      = 'system',
}

// =============================================================================
// SCHEMA
// =============================================================================

@Schema({
  timestamps: true,       // Génère createdAt + updatedAt automatiquement
  collection: 'notifications',
})
export class Notification {
  /**
   * UUID PostgreSQL de l'utilisateur propriétaire.
   * Pas d'index simple ici — couvert par l'index composé en bas de fichier.
   */
  @Prop({ required: true })
  userId: string;

  /** Catégorie de la notification */
  @Prop({
    required: true,
    enum:    NotificationType,
    default: NotificationType.SYSTEM,
  })
  type: NotificationType;

  /** Titre court affiché dans l'UI */
  @Prop({ required: true })
  title: string;

  /** Corps de la notification */
  @Prop({ required: true })
  message: string;

  /**
   * Statut de lecture.
   * Index simple omis — couvert par l'index composé { userId, read, createdAt }.
   */
  @Prop({ default: false })
  read: boolean;

  /** Lien de navigation optionnel (ex: /parcels/SL-20260424-001) */
  @Prop({ type: String, default: null })
  link: string | null;

  /** Données contextuelles libres (ID parcel, montant facture…) */
  @Prop({ type: Object, default: null })
  metadata: Record<string, unknown> | null;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// =============================================================================
// INDEXES
//
// Index composé unique — couvre les 3 requêtes principales :
//   1. find({ userId })            → liste des notifications d'un utilisateur
//   2. countDocuments({ userId, read: false }) → compteur non lues
//   3. sort({ createdAt: -1 })     → tri chronologique inverse
//
// MongoDB utilise l'index en préfixe : { userId } seul bénéficie aussi de cet index.
// =============================================================================

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });