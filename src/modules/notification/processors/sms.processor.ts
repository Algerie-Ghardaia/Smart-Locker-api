// =============================================================================
// src/modules/notification/processors/sms.processor.ts
// PROCESSOR SMS — Traitement des jobs Bull
// =============================================================================

import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { TwilioProvider } from '../providers/twilio.provider';
import { VonageProvider } from '../providers/vonage.provider';

interface PickupCodeJobData {
  phone: string;
  name?: string;
  code: string;
  shelf: string;
  expiresAt: Date;
}

@Processor('sms')
export class SmsProcessor {
  private readonly logger = new Logger(SmsProcessor.name);

  constructor(
    private readonly twilio: TwilioProvider,
    private readonly vonage: VonageProvider,
  ) {}

  @Process('send-pickup-code')
  async handleSendPickupCode(job: Job<PickupCodeJobData>) {
    const { phone, name, code, shelf, expiresAt } = job.data;

    const expiresStr = new Date(expiresAt).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    const message = `Bonjour ${name || ''}, votre colis vous attend ! Code: ${code}. Casier: ${shelf}. À retirer avant le ${expiresStr}. SmartLocker`;

    try {
      // Essayer Twilio d'abord
      const sent = await this.twilio.sendSms(phone, message);
      
      if (!sent) {
        // Fallback sur Vonage
        this.logger.warn(`Twilio échoué, tentative Vonage pour ${phone}`);
        await this.vonage.sendSms(phone, message);
      }
      
      this.logger.log(`✅ SMS envoyé à ${phone}`);
    } catch (error) {
      // ✅ CORRIGÉ : Gestion d'erreur typée
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`❌ Échec envoi SMS à ${phone}: ${errorMessage}`);
      throw error; // Bull va gérer le retry
    }
  }
}