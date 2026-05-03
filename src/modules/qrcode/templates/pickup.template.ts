// =============================================================================
// src/modules/qrcode/templates/pickup.template.ts
// TEMPLATE — Page de retrait SmartLocker
// =============================================================================

export interface PickupTemplateData {
  code: string;
  qrCode: string;
  recipientName?: string;
  shelfNo?: string;
  expiresAt?: string;
  lockerLocation?: string;
  companyName?: string;
  supportPhone?: string;
}

export function renderPickupTemplate(data: PickupTemplateData): string {
  const {
    code,
    qrCode,
    recipientName = 'Client',
    shelfNo = 'À déterminer',
    expiresAt = 'Non spécifiée',
    lockerLocation = 'Centre Commercial Bab Ezzouar, Niveau 0',
    companyName = 'SmartLocker',
    supportPhone = '+213 23 00 00 00',
  } = data;

  const formattedExpiresAt = expiresAt !== 'Non spécifiée' 
    ? new Date(expiresAt).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : expiresAt;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>${companyName} — Retrait de colis</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: linear-gradient(135deg, #0a0f1a 0%, #121827 50%, #0a0f1a 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    
    .container {
      max-width: 480px;
      width: 100%;
    }
    
    .card {
      background: rgba(30, 36, 51, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 32px;
      padding: 32px 24px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(0, 204, 102, 0.15);
    }
    
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    
    .logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-bottom: 16px;
    }
    
    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #00cc66, #00994d);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
    }
    
    .logo-text {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.5px;
    }
    
    .logo-text span {
      color: #00cc66;
    }
    
    h1 {
      color: #ffffff;
      font-size: 22px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    
    .greeting {
      color: #8b9bb5;
      font-size: 16px;
      margin-bottom: 24px;
    }
    
    .greeting strong {
      color: #00cc66;
      font-weight: 600;
    }
    
    .qr-section {
      background: #ffffff;
      border-radius: 24px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 8px 30px rgba(0, 204, 102, 0.15);
    }
    
    .qr-container {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 16px;
    }
    
    .qr-container img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
    }
    
    .code-display {
      text-align: center;
    }
    
    .code-label {
      color: #6b7a8f;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
    }
    
    .code-value {
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', monospace;
      font-size: 42px;
      font-weight: 700;
      color: #00cc66;
      letter-spacing: 12px;
      background: rgba(0, 204, 102, 0.08);
      padding: 12px 20px;
      border-radius: 16px;
      display: inline-block;
      border: 1.5px solid rgba(0, 204, 102, 0.2);
    }
    
    .info-grid {
      background: rgba(0, 0, 0, 0.2);
      border-radius: 16px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .info-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .info-row:last-child {
      border-bottom: none;
    }
    
    .info-label {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #8b9bb5;
      font-size: 14px;
    }
    
    .info-value {
      color: #ffffff;
      font-weight: 500;
      font-size: 14px;
    }
    
    .info-value.highlight {
      color: #00cc66;
      font-weight: 600;
    }
    
    .instructions {
      background: linear-gradient(135deg, rgba(0, 204, 102, 0.05), rgba(0, 204, 102, 0.02));
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      border-left: 3px solid #00cc66;
    }
    
    .instructions h3 {
      color: #00cc66;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .steps {
      list-style: none;
      padding: 0;
    }
    
    .step {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 12px;
    }
    
    .step:last-child {
      margin-bottom: 0;
    }
    
    .step-number {
      width: 24px;
      height: 24px;
      background: rgba(0, 204, 102, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #00cc66;
      font-size: 12px;
      font-weight: 600;
      flex-shrink: 0;
    }
    
    .step-text {
      color: #b8c5d6;
      font-size: 13px;
      line-height: 1.5;
    }
    
    .step-text strong {
      color: #ffffff;
    }
    
    .location {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #8b9bb5;
      font-size: 13px;
      margin-bottom: 16px;
      padding: 12px;
      background: rgba(255, 255, 255, 0.03);
      border-radius: 12px;
    }
    
    .footer {
      text-align: center;
      color: #5a6a7a;
      font-size: 12px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }
    
    .footer a {
      color: #00cc66;
      text-decoration: none;
    }
    
    .support {
      margin-top: 12px;
    }
    
    .support a {
      color: #8b9bb5;
    }
    
    .badge {
      display: inline-block;
      background: rgba(0, 204, 102, 0.15);
      color: #00cc66;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 500;
      margin-left: 8px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="logo">
          <div class="logo-icon">📦</div>
          <div class="logo-text">Smart<span>Locker</span></div>
        </div>
        <h1>Votre colis vous attend !</h1>
        <p class="greeting">
          Bonjour <strong>${recipientName}</strong>
          <span class="badge">Prêt à retirer</span>
        </p>
      </div>
      
      <div class="qr-section">
        <div class="qr-container">
          <img src="${qrCode}" alt="QR Code de retrait" />
        </div>
        <div class="code-display">
          <div class="code-label">Code de retrait</div>
          <div class="code-value">${code}</div>
        </div>
      </div>
      
      <div class="info-grid">
        <div class="info-row">
          <span class="info-label">📦 Casier</span>
          <span class="info-value highlight">${shelfNo}</span>
        </div>
        <div class="info-row">
          <span class="info-label">⏰ Expire le</span>
          <span class="info-value">${formattedExpiresAt}</span>
        </div>
      </div>
      
      <div class="location">
        <span>📍</span>
        <span>${lockerLocation}</span>
      </div>
      
      <div class="instructions">
        <h3>📋 Comment récupérer votre colis</h3>
        <ul class="steps">
          <li class="step">
            <span class="step-number">1</span>
            <span class="step-text"><strong>Rendez-vous</strong> à la borne SmartLocker</span>
          </li>
          <li class="step">
            <span class="step-number">2</span>
            <span class="step-text"><strong>Appuyez</strong> sur "Récupérer un colis"</span>
          </li>
          <li class="step">
            <span class="step-number">3</span>
            <span class="step-text"><strong>Scannez</strong> ce QR code devant la caméra</span>
          </li>
          <li class="step">
            <span class="step-number">4</span>
            <span class="step-text"><strong>Récupérez</strong> votre colis dans le casier ${shelfNo}</span>
          </li>
        </ul>
      </div>
      
      <div class="footer">
        <p>${companyName} — Récupération 24h/24 et 7j/7</p>
        <p class="support">
          Besoin d'aide ? <a href="tel:${supportPhone}">${supportPhone}</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}