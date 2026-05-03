// =============================================================================
// src/modules/user/user.controller.ts
//
// CONTROLLER UTILISATEURS — CRUD complet
//
// Routes exposées :
//   POST   /users        → create()   — public (bootstrap premier admin)
//   GET    /users        → findAll()  — ADMIN uniquement
//   GET    /users/:id    → findOne()  — ADMIN uniquement
//   PATCH  /users/:id    → update()   — ADMIN uniquement
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
}                        from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
}                        from '@nestjs/swagger';

import { UserService }    from './user.service';
import { CreateUserDto }  from './dto/create-user.dto';
import { UpdateUserDto }  from './dto/update-user.dto';
import { Roles }          from '../../common/decorators/roles.decorator';
import { Role }           from '../../common/types/role.enum';
import { RolesGuard }     from '../auth/guards/roles.guard';
import { Public }         from '../../common/decorators/public.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  // ---------------------------------------------------------------------------
  // POST /users — Création (public — bootstrap premier admin)
  // ---------------------------------------------------------------------------

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary:     'Créer un utilisateur',
    description: 'Route publique pour créer le premier administrateur. '
                + 'Les créations suivantes nécessitent un rôle ADMIN.',
  })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, description: 'Utilisateur créé avec succès' })
  @ApiResponse({ status: 409, description: 'Username ou email déjà utilisé' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  create(@Body() dto: CreateUserDto) {
    return this.userService.create(dto);
  }

  // ---------------------------------------------------------------------------
  // GET /users — Liste tous les utilisateurs (ADMIN)
  // ---------------------------------------------------------------------------

  @Get()
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:     'Lister tous les utilisateurs',
    description: 'Retourne la liste complète des comptes utilisateurs. Réservé aux administrateurs.',
  })
  @ApiResponse({ status: 200, description: 'Liste des utilisateurs' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle ADMIN requis' })
  findAll() {
    return this.userService.findAll();
  }

  // ---------------------------------------------------------------------------
  // GET /users/:id — Détail d'un utilisateur (ADMIN)
  // ---------------------------------------------------------------------------

  @Get(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:     'Récupérer un utilisateur par ID',
    description: 'Retourne le profil complet d\'un utilisateur via son UUID PostgreSQL.',
  })
  @ApiParam({
    name:        'id',
    description: 'UUID PostgreSQL de l\'utilisateur',
    example:     '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({ status: 200, description: 'Utilisateur trouvé' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle ADMIN requis' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  // ---------------------------------------------------------------------------
  // PATCH /users/:id — Mise à jour partielle (ADMIN)
  // ---------------------------------------------------------------------------

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:     'Mettre à jour un utilisateur',
    description: 'Mise à jour partielle (PATCH) — seuls les champs fournis sont modifiés. '
                + 'Le mot de passe est re-hashé automatiquement si fourni.',
  })
  @ApiParam({
    name:        'id',
    description: 'UUID PostgreSQL de l\'utilisateur à modifier',
    example:     '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, description: 'Utilisateur mis à jour' })
  @ApiResponse({ status: 404, description: 'Utilisateur introuvable' })
  @ApiResponse({ status: 409, description: 'Email déjà utilisé' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  @ApiResponse({ status: 403, description: 'Accès refusé — rôle ADMIN requis' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.userService.update(id, dto);
  }
}