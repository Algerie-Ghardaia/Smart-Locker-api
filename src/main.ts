// =============================================================================
// src/main.ts
// POINT D'ENTRÉE PRINCIPAL — SmartLocker API
// =============================================================================
//
// Responsabilités :
//   - Créer et configurer l'application NestJS
//   - Appliquer les middlewares de sécurité (Helmet, CORS, compression)
//   - Configurer le versioning URI (/api/v1/…)
//   - Appliquer les pipes, filtres et intercepteurs globaux
//   - Générer la documentation Swagger
//   - Démarrer le serveur HTTP
//
// Dernière modification : 2026-05-02
//   - Ajout du frontend Netlify dans les origins CORS
//   - Nettoyage des redondances
//   - Ajout du tag Billing Swagger
// =============================================================================

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import * as compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  // ==========================================================================
  // SÉCURITÉ
  // ==========================================================================

  // Helmet pour sécuriser les headers HTTP
  app.use(
    helmet({
      // Désactiver contentSecurityPolicy pour Swagger UI
      contentSecurityPolicy: false,
    }),
  );

  // Compression GZIP
  app.use(compression());

  // ==========================================================================
  // CORS — Configuration pour Netlify et environnements
  // ==========================================================================
  //
  // ⚠️ RÈGLE D'OR : origin: '*' + credentials: true est INTERDIT par les navigateurs.
  // ✅ Solution : liste explicite des origins autorisées
  //
  // Origins autorisées :
  //   - Production : https://luxury-malabi-acd6e0.netlify.app
  //   - Développement : http://localhost:3000, http://localhost:3001, http://localhost:3003
  //   - Netlify preview : https://*.netlify.app

  const productionOrigins = [
    'https://luxury-malabi-acd6e0.netlify.app',
    'https://*.netlify.app',
  ];

  const developmentOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ];

  // Fusionner les origins depuis variable d'environnement ou defaults
  const envOrigins =
    process.env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()) ?? [];
  const allowedOrigins = [
    ...productionOrigins,
    ...developmentOrigins,
    ...envOrigins,
  ];

  // Supprimer les doublons
  const uniqueOrigins = [...new Set(allowedOrigins)];

  logger.log(`🔒 CORS origins configurées : ${uniqueOrigins.length} origins`);

  app.enableCors({
    origin: (origin, callback) => {
      // Permettre les requêtes sans origin (ex: Postman, applications mobiles)
      if (!origin) {
        return callback(null, true);
      }

      // Vérifier si l'origine est autorisée
      const isAllowed = uniqueOrigins.some((allowed) => {
        // Support des wildcards *.netlify.app
        if (allowed.includes('*')) {
          const pattern = allowed.replace(/\*/g, '.*');
          const regex = new RegExp(`^${pattern}$`);
          return regex.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        logger.warn(`❌ CORS bloqué : ${origin}`);
        callback(new Error(`Origin ${origin} non autorisée par CORS`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'X-Requested-With',
      'Origin',
    ],
    exposedHeaders: ['Content-Disposition'],
    maxAge: 86400, // 24 heures
  });

  // ==========================================================================
  // VERSIONING ET PRÉFIXE GLOBAL
  // ==========================================================================

  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });
  app.setGlobalPrefix('api');

  // ==========================================================================
  // PIPES / FILTERS / INTERCEPTORS
  // ==========================================================================

  // Validation globale avec transformation automatique
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Supprime les champs non définis dans les DTO
      transform: true, // Transforme automatiquement les types
      forbidNonWhitelisted: true, // Rejette les requêtes avec des champs inattendus
      transformOptions: {
        enableImplicitConversion: false, // Conversion explicite uniquement
      },
    }),
  );

  // Filtre global pour les exceptions HTTP
  app.useGlobalFilters(new HttpExceptionFilter());

  // Intercepteurs globaux
  app.useGlobalInterceptors(
    new LoggingInterceptor(), // Log toutes les requêtes
    new TransformInterceptor(), // Standardise les réponses
  );

  // ==========================================================================
  // SWAGGER — Documentation API complète
  // ==========================================================================

  const config = new DocumentBuilder()
    .setTitle('SmartLocker API')
    .setDescription(
      `
## 📦 API complète pour système de casiers intelligents

### Authentification
- Utilisez le token JWT obtenu via \`POST /api/auth/login\`
- Cliquez sur "Authorize" en haut de page et entrez: \`Bearer <votre_token>\`

### Endpoints publics (sans authentification)
- \`POST /api/v1/parcels/pickup\` - Retrait de colis (scan QR ou code 6 chiffres)
- \`GET /api/v1/parcels/track/:query\` - Suivi public
- \`GET /api/v1/parcels/:trackingNo/qrcode\` - Page HTML QR code
- \`POST /api/v1/auth/login\` - Authentification
- \`POST /api/v1/auth/refresh\` - Rafraîchissement token

### Rôles utilisateurs
- **admin** : Accès total
- **operator** : Gestion des casiers et colis
- **courier** : Dépôt et retrait de colis

### Délais
- Code de retrait valable 72h
- Expiration automatique après délai
    `,
    )
    .setVersion('2.0.0')
    .setContact(
      'SmartLocker Support',
      'https://smartlocker.dz',
      'support@smartlocker.dz',
    )
    .setLicense('Proprietary', 'https://smartlocker.dz/terms')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Entrez votre token JWT : Bearer <token>',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Authentification JWT - Login / Refresh / Logout')
    .addTag('Users', 'Gestion des utilisateurs (admin uniquement)')
    .addTag('Lockers', 'Gestion des casiers SmartLocker')
    .addTag('Compartments', 'Gestion des compartiments / cases')
    .addTag('Parcels', 'Dépôt, retrait et suivi des colis')
    .addTag('Reservations', 'Réservation temporaire de casiers')
    .addTag('Notifications', 'Notifications in-app et SMS')
    .addTag('Hardware', 'Contrôle matériel des serrures')
    .addTag('Billing', 'Facturation et paiements')
    .addTag('Camera', 'Gestion des caméras de surveillance')
    .addTag('QRCode', 'Génération de QR codes')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // ==========================================================================
  // DIAGNOSTIC SWAGGER — Vérification des routes
  // ==========================================================================

  const routes = {
    auth: Object.keys(document.paths).filter((p) => p.includes('/auth')).length,
    lockers: Object.keys(document.paths).filter((p) => p.includes('/lockers'))
      .length,
    parcels: Object.keys(document.paths).filter((p) => p.includes('/parcels'))
      .length,
    billing: Object.keys(document.paths).filter((p) => p.includes('/billing'))
      .length,
    qrcode: Object.keys(document.paths).filter((p) => p.includes('/qrcode'))
      .length,
  };

  logger.log(
    `📋 Routes Swagger: Auth=${routes.auth}, Lockers=${routes.lockers}, Parcels=${routes.parcels}, Billing=${routes.billing}, QRCode=${routes.qrcode}`,
  );

  // Vérification spéciale Billing
  const billingRoutes = Object.keys(document.paths).filter((p) =>
    p.includes('/billing'),
  );
  if (billingRoutes.length === 0) {
    logger.warn('⚠️ Aucune route /billing trouvée dans Swagger');
  } else {
    logger.debug(`✅ Routes Billing: ${billingRoutes.join(', ')}`);
  }

  // Configuration Swagger UI
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Garde le token après refresh
      docExpansion: 'list', // Expansion list par défaut
      filter: true, // Filtre de recherche
      showRequestDuration: true, // Temps de réponse
      tryItOutEnabled: true, // Mode test activé
      displayRequestDuration: true,
      operationsSorter: 'method', // Trie par méthode HTTP
      tagsSorter: 'alpha', // Trie les tags alphabétiquement
    },
    customSiteTitle: 'SmartLocker API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    jsonDocumentUrl: '/docs/json',
    yamlDocumentUrl: '/docs/yaml',
  });

  // ==========================================================================
  // DÉMARRAGE DU SERVEUR
  // ==========================================================================

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  // ==========================================================================
  // AFFICHAGE DU BANNER DE DÉMARRAGE
  // ==========================================================================

  console.log(`\n${'='.repeat(70)}`);
  console.log(`🚀 SmartLocker API - Service démarré avec succès`);
  console.log(`${'='.repeat(70)}`);
  console.log(`📡 Serveur HTTP     : http://localhost:${port}`);
  console.log(`📚 Documentation    : http://localhost:${port}/docs`);
  console.log(`🔌 WebSocket        : ws://localhost:${port}/locker`);
  console.log(`🔗 API Version      : /api/v1/*`);
  console.log(`\n🔓 Endpoints publics (sans authentification) :`);
  console.log(
    `   POST   /api/v1/parcels/pickup       - Retrait colis (QR/manuel)`,
  );
  console.log(`   GET    /api/v1/parcels/track/:query - Suivi colis`);
  console.log(`   GET    /api/v1/parcels/:trackingNo/qrcode - QR code HTML`);
  console.log(`   POST   /api/v1/auth/login           - Authentification`);
  console.log(`\n🌐 CORS - Origins autorisées :`);
  uniqueOrigins.forEach((origin) => console.log(`   - ${origin}`));
  console.log(`\n✅ Tous les modules sont chargés et prêts`);
  console.log(`${'='.repeat(70)}\n`);
}

// Gestion des erreurs non capturées
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

bootstrap();
