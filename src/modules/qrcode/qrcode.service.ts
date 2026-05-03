// =============================================================================
// src/modules/qrcode/qrcode.service.ts
// SERVICE — Génération professionnelle de QR codes
// =============================================================================

import { Injectable, Logger } from '@nestjs/common';
import * as QRCode from 'qrcode';
import {
  GenerateQRDto,
  QRCodeFormat,
  QRCodeTemplate,
} from './dto/generate-qr.dto';
import { renderPickupTemplate } from './templates/pickup.template';
import { renderEmailTemplate } from './templates/email.template';

@Injectable()
export class QRCodeService {
  private readonly logger = new Logger(QRCodeService.name);

  /**
   * Génère un QR code selon les spécifications fournies
   */
  async generate(dto: GenerateQRDto): Promise<Buffer | string> {
    const options = {
      width: dto.width || 400,
      margin: dto.margin || 2,
      color: {
        dark: dto.colorDark || '#000000',
        light: dto.colorLight || '#FFFFFF',
      },
    };

    try {
      switch (dto.format) {
        case QRCodeFormat.PNG:
          return await QRCode.toBuffer(dto.content, {
            ...options,
            type: 'png',
          });

        case QRCodeFormat.SVG:
          return await QRCode.toString(dto.content, {
            ...options,
            type: 'svg',
          });

        case QRCodeFormat.BASE64:
          const buffer = await QRCode.toBuffer(dto.content, {
            ...options,
            type: 'png',
          });
          return buffer.toString('base64');

        case QRCodeFormat.DATA_URL:
        default:
          return await QRCode.toDataURL(dto.content, options);
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error(`Erreur génération QR code: ${errorMessage}`);
      throw new Error(`Échec de la génération du QR code: ${errorMessage}`);
    }
  }

  /**
   * Génère une page HTML complète avec template
   */
  async generateHTMLPage(
    dto: GenerateQRDto,
    qrCodeDataUrl: string,
  ): Promise<string> {
    const commonData = {
      code: dto.content,
      qrCode: qrCodeDataUrl,
      recipientName: dto.recipientName,
      shelfNo: dto.shelfNo,
      expiresAt: dto.expiresAt,
    };

    // Utilisation de l'enum pour la comparaison
    switch (dto.template) {
      case QRCodeTemplate.PICKUP:
        return renderPickupTemplate(commonData);

      case QRCodeTemplate.EMAIL:
        return renderEmailTemplate(commonData);

      case QRCodeTemplate.SIMPLE:
      default:
        return this.renderSimpleTemplate(dto.content, qrCodeDataUrl);
    }
  }

  /**
   * Template simple (fallback)
   */
  private renderSimpleTemplate(code: string, qrCode: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family: sans-serif; text-align: center; padding: 20px;">
        <h1>QR Code</h1>
        <p>Code: <strong>${code}</strong></p>
        <img src="${qrCode}" alt="QR Code" style="max-width: 300px;" />
      </body>
      </html>
    `;
  }
}
