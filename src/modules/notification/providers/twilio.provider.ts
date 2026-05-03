// =============================================================================
// src/modules/notification/providers/twilio.provider.ts
// PROVIDER TWILIO — Envoi de SMS via Twilio
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Twilio from 'twilio'; // <--- Changement ici

@Injectable()
export class TwilioProvider {
  private readonly logger = new Logger(TwilioProvider.name);
  private client: Twilio.Twilio | null = null; // <--- Typage correct

  constructor(private config: ConfigService) {
    const accountSid = this.config.get<string>('TWILIO_SID');
    const authToken = this.config.get<string>('TWILIO_AUTH_TOKEN');
    
    if (accountSid && authToken) {
      // ✅ Fonctionne car Twilio est importé comme default export
      this.client = Twilio(accountSid, authToken);
      this.logger.log('✅ Twilio client initialized');
    } else {
      this.logger.warn('⚠️ Twilio non configuré - SMS désactivés');
    }
  }

  async sendSms(to: string, body: string): Promise<boolean> {
    if (!this.client) {
      this.logger.warn('Twilio non disponible');
      return false;
    }

    try {
      const from = this.config.get<string>('TWILIO_PHONE');
      
      if (!from) {
        this.logger.error('TWILIO_PHONE non défini');
        return false;
      }

      const message = await this.client.messages.create({
        body,
        to,
        from,
      });
      
      this.logger.log(`SMS envoyé à ${to} - SID: ${message.sid}`);
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Twilio error: ${errorMessage}`);
      return false;
    }
  }
}