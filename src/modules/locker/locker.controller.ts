// =============================================================================
// src/modules/locker/locker.controller.ts
// CONTROLLER CASIERS — Endpoints REST complets (REFONDU)
// =============================================================================
//
// Routes (ordre = routes statiques AVANT routes dynamiques) :
//   POST   /lockers                  → créer un casier + compartiments   [Admin]
//   GET    /lockers/map              → lister pour la carte (léger)       [Tous]
//   GET    /lockers                  → lister tous les casiers (complet)  [Tous]
//   GET    /lockers/:id              → détail d'un casier                 [Tous]
//   GET    /lockers/:id/status       → statut temps réel (DB + Redis)     [Admin, Op]
//   GET    /lockers/:id/stats        → statistiques d'occupation          [Admin, Op]
//   GET    /lockers/:id/compartments → compartiments du casier            [Admin, Op]
//   PATCH  /lockers/:id              → mettre à jour un casier            [Admin]
//   DELETE /lockers/:id              → supprimer un casier                [Admin]
//
// ⚠️ IMPORTANT : GET /lockers/map DOIT être déclaré AVANT GET /lockers/:id
//   pour éviter que NestJS interprète "map" comme un paramètre :id.
//
// Convention de réponse :
//   Le TransformInterceptor global encapsule chaque retour dans
//   { success: true, data: <payload>, timestamp, path }.
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';

import { LockerService } from './locker.service';
import { Role } from '../../common/types/role.enum';
import { Roles } from '../../common/decorators/roles.decorator';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';

@ApiTags('Lockers')
@ApiBearerAuth('JWT-auth')
@Controller('lockers')
export class LockerController {
  constructor(private readonly lockerService: LockerService) {}

  // ---------------------------------------------------------------------------
  // POST /lockers — Créer un casier (Admin uniquement)
  // ---------------------------------------------------------------------------

  @Post()
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: 'Créer un casier complet avec ses compartiments',
    description:
      'Crée un casier physique (borne) et génère simultanément ses ' +
      'compartiments dans une transaction atomique. ' +
      'Initialise le cache Redis pour chaque compartiment.',
  })
  @ApiResponse({ status: 201, description: 'Casier créé avec succès' })
  @ApiResponse({ status: 409, description: 'Nom ou numéro de série déjà utilisé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Rôle ADMIN requis' })
  create(@Body() dto: CreateLockerDto) {
    return this.lockerService.create(dto);
  }

  // ---------------------------------------------------------------------------
  // GET /lockers/map — Casiers pour la carte (AVANT /lockers/:id !)
  // ---------------------------------------------------------------------------

  @Get('map')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.USER, Role.COURIER)
  @SkipThrottle({ auth: true })
  @ApiOperation({
    summary: '📌 Lister les casiers pour la carte Leaflet (léger — ~5ms)',
    description:
      'Endpoint optimisé pour la carte interactive.\n\n' +
      'Retourne UNIQUEMENT : id, name, latitude, longitude, location.\n' +
      'Filtre : casiers actifs uniquement (isActive = true).\n' +
      'Pas de relations (compartments non chargés).\n\n' +
      'Performance : ~5ms (contre ~1500ms pour GET /lockers).',
  })
  @ApiResponse({
    status: 200,
    description: 'Liste légère des casiers pour les marqueurs de carte',
  })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async findAllForMap() {
    return this.lockerService.findAllForMap();
  }

  // ---------------------------------------------------------------------------
  // GET /lockers — Lister tous les casiers (dashboard admin)
  // ---------------------------------------------------------------------------

  @Get()
  @Roles(Role.ADMIN, Role.OPERATOR, Role.USER, Role.COURIER)
  @SkipThrottle({ auth: true })
  @ApiOperation({
    summary: 'Lister tous les casiers (données complètes)',
    description:
      'Retourne la liste complète des casiers avec leurs compartiments. ' +
      'Pour la carte Leaflet, utilisez plutôt GET /lockers/map.',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Filtre par nom ou localisation (réservé, non implémenté)',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiResponse({ status: 200, description: 'Liste des casiers' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async findAll(
    @Query('search') _search?: string,
    @Query('page') _page?: string,
    @Query('limit') _limit?: string,
  ) {
    return this.lockerService.findAll();
  }

  // ---------------------------------------------------------------------------
  // GET /lockers/:id — Détail d'un casier
  // ---------------------------------------------------------------------------

  @Get(':id')
  @Roles(Role.ADMIN, Role.OPERATOR, Role.USER, Role.COURIER)
  @ApiOperation({ summary: 'Récupérer un casier par son ID' })
  @ApiParam({
    name: 'id',
    description: 'UUID du casier',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Casier trouvé' })
  @ApiResponse({ status: 404, description: 'Casier non trouvé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lockerService.findOne(id);
  }

  // ---------------------------------------------------------------------------
  // GET /lockers/:id/status — Statut temps réel
  // ---------------------------------------------------------------------------

  @Get(':id/status')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({
    summary: 'Statut en temps réel du casier (DB + Redis)',
    description:
      'Fusionne les données de la base (compartiments) avec le cache ' +
      "Redis pour retourner l'état instantané de chaque case.",
  })
  @ApiParam({ name: 'id', description: 'UUID du casier' })
  @ApiResponse({ status: 200, description: 'Statut temps réel' })
  @ApiResponse({ status: 404, description: 'Casier non trouvé' })
  getStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.lockerService.getStatus(id);
  }

  // ---------------------------------------------------------------------------
  // GET /lockers/:id/stats — Statistiques d'occupation
  // ---------------------------------------------------------------------------

  @Get(':id/stats')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({
    summary: "Statistiques d'occupation du casier",
    description:
      "Taux d'occupation global, répartition par statut et par taille.",
  })
  @ApiParam({ name: 'id', description: 'UUID du casier' })
  @ApiResponse({ status: 200, description: 'Statistiques calculées' })
  @ApiResponse({ status: 404, description: 'Casier non trouvé' })
  getStats(@Param('id', ParseUUIDPipe) id: string) {
    return this.lockerService.getStats(id);
  }

  // ---------------------------------------------------------------------------
  // GET /lockers/:id/compartments — Compartiments
  // ---------------------------------------------------------------------------

  @Get(':id/compartments')
  @Roles(Role.ADMIN, Role.OPERATOR)
  @ApiOperation({
    summary: "Liste des compartiments d'un casier",
    description: 'Compartiments avec leur statut courant.',
  })
  @ApiParam({ name: 'id', description: 'UUID du casier' })
  @ApiResponse({ status: 200, description: 'Compartiments listés' })
  @ApiResponse({ status: 404, description: 'Casier non trouvé' })
  async getCompartments(@Param('id', ParseUUIDPipe) id: string) {
    const locker = await this.lockerService.findOne(id);
    return locker.compartments;
  }

  // ---------------------------------------------------------------------------
  // PATCH /lockers/:id — Mettre à jour un casier
  // ---------------------------------------------------------------------------

  @SkipThrottle()
  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiOperation({
    summary: "Mettre à jour les informations d'un casier",
    description:
      'Mise à jour partielle (PATCH) — seuls les champs fournis sont modifiés. ' +
      'Accepte latitude/longitude pour la géolocalisation.',
  })
  @ApiParam({ name: 'id', description: 'UUID du casier' })
  @ApiResponse({ status: 200, description: 'Casier mis à jour' })
  @ApiResponse({ status: 404, description: 'Casier non trouvé' })
  @ApiResponse({ status: 409, description: 'Nom déjà utilisé' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLockerDto,
  ) {
    return this.lockerService.update(id, dto);
  }

  // ---------------------------------------------------------------------------
  // DELETE /lockers/:id — Supprimer un casier
  // ---------------------------------------------------------------------------

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Supprimer un casier et tous ses compartiments',
    description:
      'Suppression en cascade (compartiments + cache Redis). ' +
      'Impossible si des colis sont encore au statut STORED.',
  })
  @ApiParam({ name: 'id', description: 'UUID du casier' })
  @ApiResponse({ status: 204, description: 'Casier supprimé' })
  @ApiResponse({ status: 404, description: 'Casier non trouvé' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.lockerService.remove(id);
  }
}