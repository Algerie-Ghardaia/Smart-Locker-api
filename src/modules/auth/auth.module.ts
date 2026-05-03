// =============================================================================
// src/modules/auth/auth.module.ts
// MODULE D'AUTHENTIFICATION — JWT + Refresh Tokens
// =============================================================================
//
// CORRECTION 2025 :
//   - Configuration JWT simplifiée
//   - expiresIn en string (compatible)
// =============================================================================

import { Module } from '@nestjs/common';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    UserModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService): JwtModuleOptions => {
        const secret = configService.get<string>('JWT_SECRET');
        const expiresIn = configService.get<string>('JWT_EXPIRES_IN', '15m');

        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment');
        }

        return {
          secret,
         signOptions: {
            expiresIn: expiresIn as any, // ✅ Force le type - solution pragmatique
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
