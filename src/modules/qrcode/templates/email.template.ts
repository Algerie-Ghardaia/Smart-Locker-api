// =============================================================================
// src/modules/qrcode/templates/email.template.ts
// TEMPLATE — Page/Email de retrait SmartLocker
// =============================================================================

export interface EmailTemplateData {
  code: string;
  qrCode: string; // Data URL ou URL publique
  recipientName?: string;
  shelfNo?: string;
  expiresAt?: string;
  lockerLocation?: string;
  companyName?: string;
  supportPhone?: string;
  supportEmail?: string;
}

export function renderEmailTemplate(data: EmailTemplateData): string {
  const {
    code,
    qrCode,
    recipientName = 'Client',
    shelfNo = 'À déterminer',
    expiresAt = 'Non spécifiée',
    lockerLocation = 'Centre Commercial Bab Ezzouar, Niveau 0',
    companyName = 'SmartLocker',
    supportPhone = '+213 23 00 00 00',
    supportEmail = 'support@smartlocker.dz',
  } = data;

  // Formatage de la date
  const formattedExpiresAt = expiresAt && expiresAt !== 'Non spécifiée' 
    ? new Date(expiresAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : expiresAt;

  // Couleurs de la marque
  const primaryColor = '#2563EB'; // Bleu moderne
  const textColor = '#1F2937';
  const bgColor = '#F3F4F6';
  const cardBg = '#FFFFFF';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre colis est prêt - ${companyName}</title>
  <style>
    /* Reset CSS pour email */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: ${bgColor}; }
    
    /* Styles spécifiques */
    .email-container { max-width: 600px; margin: 0 auto; background-color: ${cardBg}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background-color: ${primaryColor}; padding: 20px; text-align: center; color: white; }
    .content { padding: 30px 20px; text-align: center; color: ${textColor}; }
    .qr-section { margin: 20px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border: 1px dashed #d1d5db; }
    .code-display { font-size: 24px; font-weight: bold; letter-spacing: 2px; color: ${primaryColor}; margin: 10px 0; }
    .btn { display: inline-block; padding: 12px 24px; background-color: ${primaryColor}; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 10px; }
    .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6B7280; }
    .info-row { display: flex; justify-content: space-between; margin-bottom: 10px; text-align: left; }
    .info-label { font-weight: bold; color: #4B5563; }
    
    @media only screen and (max-width: 600px) {
      .email-container { width: 100% !important; border-radius: 0 !important; }
      .content { padding: 20px 15px !important; }
    }
  </style>
</head>
<body>
  <div style="padding: 20px 0;">
    <table role="presentation" class="email-container" width="100%" cellspacing="0" cellpadding="0" border="0" align="center">
      <!-- Header -->
      <tr>
        <td class="header">
          <h1 style="margin: 0; font-size: 24px;">📦 ${companyName}</h1>
          <p style="margin: 5px 0 0; font-size: 14px; opacity: 0.9;">Votre colis vous attend !</p>
        </td>
      </tr>

      <!-- Content -->
      <tr>
        <td class="content">
          <h2 style="margin: 0 0 10px; font-size: 20px;">Bonjour ${recipientName},</h2>
          <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.5;">
            Votre colis est arrivé et est prêt à être retiré. Veuillez présenter le QR Code ci-dessous à la borne SmartLocker.
          </p>

          <!-- QR Code Section -->
          <div class="qr-section">
            <img src="${qrCode}" alt="QR Code de retrait" width="200" height="200" style="display: block; margin: 0 auto;" />
            <p style="margin: 15px 0 5px; font-size: 14px; color: #6B7280;">Ou utilisez le code manuel :</p>
            <div class="code-display">${code}</div>
          </div>

          <!-- Details -->
          <div style="text-align: left; background: #fff; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin-top: 20px;">
            <div class="info-row">
              <span class="info-label">📍 Casier :</span>
              <span>${shelfNo}</span>
            </div>
            <div class="info-row">
              <span class="info-label">⏰ Expire le :</span>
              <span>${formattedExpiresAt}</span>
            </div>
            <div class="info-row">
              <span class="info-label">🏢 Lieu :</span>
              <span>${lockerLocation}</span>
            </div>
          </div>

          <p style="margin-top: 25px; font-size: 14px; color: #6B7280;">
            Rendez-vous à la borne, appuyez sur "Récupérer un colis" et scannez ce code.
          </p>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td class="footer">
          <p style="margin: 0 0 10px;">Besoin d'aide ?</p>
          <p style="margin: 0;">
            📞 <a href="tel:${supportPhone}" style="color: ${primaryColor}; text-decoration: none;">${supportPhone}</a> 
            &nbsp;|&nbsp; 
            ✉️ <a href="mailto:${supportEmail}" style="color: ${primaryColor}; text-decoration: none;">${supportEmail}</a>
          </p>
          <p style="margin-top: 15px; font-size: 11px; color: #9CA3AF;">
            © ${new Date().getFullYear()} ${companyName}. Tous droits réservés.<br>
            Récupération 24h/24 et 7j/7.
          </p>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>
`;
}