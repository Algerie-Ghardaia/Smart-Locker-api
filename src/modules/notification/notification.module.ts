// =============================================================================
// src/modules/notification/notification.module.ts
//
// MODULE NOTIFICATIONS — SMS + In-app (MongoDB)
//
// Ce module gère deux canaux de notification :
//   1. In-app  — notifications persistées en MongoDB, exposées via REST
//   2. SMS     — envoi asynchrone via Bull queue (Twilio + Vonage fallback)
//
// Exports :
//   NotificationService → consommé par ParcelModule, BillingModule, etc.
//   pour créer des notifications lors d'événements métier.
//
// Dépendances :
//   - MongooseModule : persistance des notifications in-app
//   - BullModule     : file d'attente SMS (queue "sms")
// =============================================================================

import { Module }           from '@nestjs/common';
import { MongooseModule }   from '@nestjs/mongoose';
import { BullModule }       from '@nestjs/bull';

import { NotificationController } from './notification.controller';
import { NotificationService }    from './notification.service';
import { SmsProcessor }           from './processors/sms.processor';
import { TwilioProvider }         from './providers/twilio.provider';
import { VonageProvider }         from './providers/vonage.provider';
import {
  Notification,
  NotificationSchema,
}                                 from './schemas/notification.schema';

@Module({
  imports: [
    // Schéma MongoDB pour les notifications in-app
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),

    // Queue Bull "sms" — partagée avec SmsProcessor
    // La configuration Redis de Bull est héritée de BullModule.forRootAsync (AppModule)
    BullModule.registerQueue({ name: 'sms' }),
  ],
  controllers: [NotificationController],
  providers: [
    NotificationService,
    SmsProcessor,    // Consomme la queue "sms" (jobs send-pickup-code)
    TwilioProvider,  // Provider SMS principal
    VonageProvider,  // Provider SMS fallback
  ],
  // NotificationService est exporté pour être injecté dans d'autres modules
  exports: [NotificationService],
})
export class NotificationModule {}