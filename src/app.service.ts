// =============================================================================
// src/app.service.ts
// SERVICE RACINE — Health check et informations API
// =============================================================================

import { Injectable } from '@nestjs/common';

/**
 * AppService
 * Service racine responsable des informations globales et du health check.
 */
@Injectable()
export class AppService {
  /**
   * Retourne le message de statut par défaut.
   * Utilisé principalement pour les tests unitaires et le health check basique.
   */
  getHello(): string {
    return '"Hello SmartLocker API is running! 🚀 ' ;
  }

  /**
   * Retourne les informations détaillées de l'API.
   * Utile pour les endpoints d'information ou de versioning.
   */
  getInfo(): {
    name: string;
    version: string;
    description: string;
    status: string;
    docs: string;
    timestamp: string;
  } {
    return {
      name: 'SmartLocker API',
      version: '1.3.0',
      description: 'Système de gestion de casiers intelligents',
      status: 'operational',
      docs: '/docs', // Chemin vers Swagger
      timestamp: new Date().toISOString(),
    };
  }
}
