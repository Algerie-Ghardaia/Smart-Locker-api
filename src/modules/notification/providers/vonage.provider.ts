// =============================================================================
// src/modules/notification/providers/vonage.provider.ts
// PROVIDER VONAGE — Fallback SMS via Vonage
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VonageProvider {
  private readonly logger = new Logger(VonageProvider.name);

  constructor(private config: ConfigService) {}

  async sendSms(to: string, body: string): Promise<boolean> {
    const apiKey = this.config.get('VONAGE_API_KEY');
    const apiSecret = this.config.get('VONAGE_API_SECRET');
    
    if (!apiKey || !apiSecret) {
      this.logger.warn('Vonage non configuré');
      return false;
    }

    this.logger.log(`[Vonage Simulation] SMS à ${to}: ${body}`);
    return true;
  }
}