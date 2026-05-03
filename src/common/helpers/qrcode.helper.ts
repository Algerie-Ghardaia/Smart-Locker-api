// =============================================================================
// src/common/helpers/qrcode.helper.ts
// HELPER — Génération de QR codes pour les codes de retrait
// =============================================================================

import * as QRCode from 'qrcode';

/**
 * Génère un QR code en base64 à partir d'un code de retrait.
 * Le QR code contient UNIQUEMENT le code (ex: "123456").
 * C'est ce format qui est scanné par la borne.
 * 
 * @param code - Code de retrait (ex: "123456")
 * @returns Data URL du QR code (data:image/png;base64,...)
 */
export async function generateQRCodeBase64(code: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(code, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000000',  // Couleur des modules
        light: '#FFFFFF', // Fond blanc
      },
    });
    return qrDataUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    throw new Error(`Erreur génération QR code: ${errorMessage}`);
  }
}

/**
 * Génère un QR code avec une URL complète (pour ouverture web ou test).
 * Format : "http://localhost:3001/pickup?code=123456"
 * 
 * @param code - Code de retrait
 * @param baseUrl - URL de base du frontend
 * @returns Data URL du QR code
 */
export async function generateQRCodeWithUrl(
  code: string,
  baseUrl: string = process.env.FRONTEND_URL || 'http://localhost:3001'
): Promise<string> {
  const url = `${baseUrl}/pickup?code=${code}`;
  return generateQRCodeBase64(url);
}