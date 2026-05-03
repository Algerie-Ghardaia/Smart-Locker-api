// =============================================================================
// src/modules/auth/auth.controller.ts
// CONTROLLER D'AUTHENTIFICATION — Routes publiques et privées
// =============================================================================
//
// CORRECTION 2025 :
//   - Aucune modification nécessaire
//   - Le contrôleur est déjà correct
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type {
  LoginResponse,
  RefreshResponse,
  LogoutResponse,
  ProfileResponse,
  AuthenticatedUser,
} from './auth.types';
import { JwtAuthGuard } from './guards/jwt.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ===========================================================================
  // POST /auth/login (Public)
  // ===========================================================================

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Connexion utilisateur' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Connexion réussie' })
  @ApiResponse({ status: 401, description: 'Identifiants invalides' })
  async login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.authService.login(dto);
  }

  // ===========================================================================
  // POST /auth/refresh (Public)
  // ===========================================================================

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rafraîchir les tokens' })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'Tokens rafraîchis' })
  @ApiResponse({ status: 401, description: 'Refresh token invalide' })
  async refresh(@Body() dto: RefreshDto): Promise<RefreshResponse> {
    return this.authService.refresh(dto.refreshToken);
  }

  // ===========================================================================
  // POST /auth/logout (Privé)
  // ===========================================================================

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Déconnexion' })
  @ApiResponse({ status: 200, description: 'Déconnexion réussie' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async logout(@CurrentUser('id') userId: string): Promise<LogoutResponse> {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.authService.logout(userId);
  }

  // ===========================================================================
  // GET /auth/profile (Privé)
  // ===========================================================================

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Profil utilisateur' })
  @ApiResponse({ status: 200, description: 'Profil récupéré' })
  @ApiResponse({ status: 401, description: 'Non authentifié' })
  async getProfile(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ProfileResponse> {
    if (!user?.id) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.authService.getProfile(user.id);
  }
}