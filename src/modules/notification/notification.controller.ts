// =============================================================================
// src/modules/notification/notification.controller.ts
//
// CONTROLLER NOTIFICATIONS — Routes REST in-app
//
// Routes exposées :
//   GET    /notifications              → liste paginée par utilisateur
//   GET    /notifications/unread/count → compteur non lues (polling)
//   PATCH  /notifications/:id/read    → marquer une notification comme lue
//   POST   /notifications/read-all    → tout marquer comme lu
//   DELETE /notifications/:id         → supprimer une notification
//
// Throttling :
//   Toutes les routes    → groupe "default" (100 req/min via guard global APP_GUARD)
//   GET /unread/count    → groupes "default" et "auth" ignorés via @SkipThrottle
//                          groupe "polling" seul actif (60 req/min)
//
//   Raison du SkipThrottle sur /unread/count :
//     Le groupe "auth" (5 req/min) est conçu pour les endpoints de login.
//     Appliqué globalement, il bloque /unread/count dès le chargement du dashboard
//     car plusieurs composants s'y abonnent en parallèle (burst de montage).
//
// Ordre des routes :
//   /unread/count DOIT être déclaré AVANT /:id — NestJS résout dans l'ordre
//   de déclaration. Sans ça, "unread" serait capturé comme un ID dynamique.
//
// Convention de réponse :
//   Les méthodes retournent le payload brut.
//   Le TransformInterceptor global encapsule dans :
//   { success: true, data: <payload>, timestamp, path }
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

import { NotificationService } from './notification.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// Bornes de pagination — validées dans le controller avant d'appeler le service
const PAGE_MIN = 1;
const LIMIT_MIN = 1;
const LIMIT_MAX = 50;

@ApiTags('Notifications')
@Controller('notifications')
@ApiBearerAuth('JWT-auth')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // ---------------------------------------------------------------------------
  // GET /notifications — Liste paginée
  // ---------------------------------------------------------------------------

  @Get()
  @ApiOperation({
    summary: 'Liste paginée des notifications',
    description:
      "Retourne les notifications de l'utilisateur connecté, triées par date décroissante.",
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    example: 1,
    description: `Numéro de page (>= ${PAGE_MIN})`,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    example: 20,
    description: `Éléments par page (${LIMIT_MIN}–${LIMIT_MAX})`,
  })
  @ApiResponse({
    status: 200,
    description: 'Liste paginée avec métadonnées (total, unread, pages…)',
  })
  @ApiResponse({
    status: 400,
    description: 'Paramètres de pagination invalides',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async findAll(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    if (page < PAGE_MIN) {
      throw new BadRequestException(`page doit être >= ${PAGE_MIN}`);
    }
    if (limit < LIMIT_MIN || limit > LIMIT_MAX) {
      throw new BadRequestException(
        `limit doit être entre ${LIMIT_MIN} et ${LIMIT_MAX}`,
      );
    }

    return this.notificationService.findByUser(userId, page, limit);
  }

  // ---------------------------------------------------------------------------
  // GET /notifications/unread/count — Compteur non lues (polling frontend)
  //
  // ⚠️  Déclaré AVANT /:id pour éviter que NestJS interprète "unread" comme un ID.
  // ⚠️  @SkipThrottle sur "default" et "auth" — seul le groupe "polling" s'applique.
  // ---------------------------------------------------------------------------

  @Get('unread/count')
  @SkipThrottle({ default: true, auth: true })
  @Throttle({ polling: { ttl: 60_000, limit: 60 } })
  @ApiOperation({
    summary: 'Nombre de notifications non lues',
    description:
      'Endpoint de polling (60s). Groupes "default" et "auth" ignorés — groupe "polling" seul actif (60 req/min).',
  })
  @ApiResponse({
    status: 200,
    description: 'Compteur de notifications non lues',
    schema: {
      example: {
        success: true,
        data: { count: 5 },
        timestamp: '2026-04-26T19:00:00.000Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getUnreadCount(@CurrentUser('id') userId: string) {
    const count = await this.notificationService.countUnread(userId);
    return { count };
  }

  // ---------------------------------------------------------------------------
  // PATCH /notifications/:id/read — Marquer une notification comme lue
  // ---------------------------------------------------------------------------

  @Patch(':id/read')
  @ApiOperation({ summary: 'Marquer une notification comme lue' })
  @ApiParam({
    name: 'id',
    description: 'ID MongoDB de la notification (ObjectId)',
  })
  @ApiResponse({ status: 200, description: 'Notification mise à jour' })
  @ApiResponse({
    status: 404,
    description:
      'Notification introuvable ou appartient à un autre utilisateur',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async markAsRead(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.markAsRead(userId, notificationId);
  }

  // ---------------------------------------------------------------------------
  // POST /notifications/read-all — Tout marquer comme lu
  // ---------------------------------------------------------------------------

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marquer toutes les notifications comme lues' })
  @ApiResponse({
    status: 200,
    description: 'Nombre de notifications marquées',
    schema: { example: { success: true, data: { marked: 5 } } },
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async markAllAsRead(@CurrentUser('id') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  // ---------------------------------------------------------------------------
  // DELETE /notifications/:id — Supprimer une notification
  // ---------------------------------------------------------------------------

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une notification' })
  @ApiParam({
    name: 'id',
    description: 'ID MongoDB de la notification (ObjectId)',
  })
  @ApiResponse({ status: 200, description: 'Notification supprimée' })
  @ApiResponse({ status: 404, description: 'Notification introuvable' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async delete(
    @CurrentUser('id') userId: string,
    @Param('id') notificationId: string,
  ) {
    return this.notificationService.delete(userId, notificationId);
  }
}
