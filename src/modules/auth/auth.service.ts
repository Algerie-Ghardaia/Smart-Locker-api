// =============================================================================
// src/modules/auth/auth.service.ts
// SERVICE D'AUTHENTIFICATION — Login / Refresh / Logout / Profile
// =============================================================================
//
// CORRECTION 2025 :
//   - Correction du typage pour jwtService.signAsync()
//   - Le payload est casté en Record<string, any> pour compatibilité
//   - La configuration expiresIn utilise le bon type
// =============================================================================

import {
  Injectable,
  UnauthorizedException,
  Logger,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { LoginDto } from './dto/login.dto';
import { REDIS_CLIENT } from '../redis/redis.module';
import type {
  JwtPayload,
  SafeUserPayload,
  LoginResponse,
  RefreshResponse,
  LogoutResponse,
  ProfileResponse,
  UserForToken,
} from './auth.types';

// -----------------------------------------------------------------------------
// Constantes
// -----------------------------------------------------------------------------

const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 jours en secondes

// -----------------------------------------------------------------------------
// Service
// -----------------------------------------------------------------------------

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  async login(dto: LoginDto): Promise<LoginResponse> {
    const user = await this.userService.findByIdentifier(dto.username);
    if (!user) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    const tokens = await this.generateTokens({
      id: user.id,
      username: user.username,
      role: user.role,
    });

    await this.redis.setex(
      `refresh:${user.id}`,
      REFRESH_TOKEN_TTL,
      tokens.refreshToken,
    );

    this.logger.log(`✅ Login réussi: ${user.username} (${user.id})`);

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: this.toSafeUser(user),
    };
  }

  // ---------------------------------------------------------------------------
  // REFRESH
  // ---------------------------------------------------------------------------

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    try {
      const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
      if (!refreshSecret) {
        throw new Error('JWT_REFRESH_SECRET is not defined');
      }

      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: refreshSecret,
      });

      const storedToken = await this.redis.get(`refresh:${payload.sub}`);
      if (storedToken !== refreshToken) {
        throw new UnauthorizedException('Refresh token invalide ou révoqué');
      }

      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Utilisateur non trouvé');
      }

      const tokens = await this.generateTokens({
        id: user.id,
        username: user.username,
        role: user.role,
      });

      await this.redis.setex(
        `refresh:${user.id}`,
        REFRESH_TOKEN_TTL,
        tokens.refreshToken,
      );

      this.logger.log(`🔄 Token rafraîchi: ${user.username} (${user.id})`);

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`❌ Refresh error: ${errorMessage}`);
      throw new UnauthorizedException('Refresh token invalide ou expiré');
    }
  }

  // ---------------------------------------------------------------------------
  // LOGOUT
  // ---------------------------------------------------------------------------

  async logout(userId: string): Promise<LogoutResponse> {
    await this.redis.del(`refresh:${userId}`);
    this.logger.log(`🚪 Logout: ${userId}`);
    return { message: 'Déconnexion réussie' };
  }

  // ---------------------------------------------------------------------------
  // PROFILE
  // ---------------------------------------------------------------------------

  async getProfile(userId: string): Promise<ProfileResponse> {
    if (!userId) {
      throw new UnauthorizedException('ID utilisateur manquant');
    }

    const user = await this.userService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('Utilisateur non trouvé');
    }

    return this.toSafeUser(user);
  }

  // ---------------------------------------------------------------------------
  // HELPERS PRIVÉS
  // ---------------------------------------------------------------------------

  /**
   * Génère une paire accessToken / refreshToken.
   *
   * ✅ CORRECTION : Le payload est passé en tant qu'objet Record<string, any>
   * compatible avec jwtService.signAsync(). Aucun "as any" nécessaire.
   */
  private async generateTokens(
    user: UserForToken,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // ✅ Convertir en Record<string, any> — compatible avec signAsync()
    const payload: Record<string, any> = {
      sub: user.id,
      username: user.username,
      role: user.role,
    };

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    const refreshExpiresIn = this.configService.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    if (!refreshSecret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }

    const [accessToken, refreshToken] = await Promise.all([
      // Token d'accès — utilise la configuration par défaut du JwtModule
      this.jwtService.signAsync(payload),

      // Refresh token — configuration spécifique
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn as any, // ✅ Accepté : string → StringValue
      }),
    ]);

    return { accessToken, refreshToken };
  }

  /**
   * Extrait un sous-ensemble sûr des champs utilisateur.
   * Le mot de passe n'est JAMAIS inclus.
   */
  private toSafeUser(user: any): SafeUserPayload {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      phone: user.phone ?? null,
      role: user.role,
      isActive: user.isActive ?? true,
    };
  }
}