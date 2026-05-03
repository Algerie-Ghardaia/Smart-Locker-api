// =============================================================================
// src/modules/parcel/parcel.controller.ts
// CONTROLLER COLIS (VERSION STABLE)
// =============================================================================
//
// ✅ Route publique POST /parcels/pickup déjà configurée avec @Public()
// ✅ DTO PickupDto enrichi avec champ 'method'
// =============================================================================

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Res,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { Response } from 'express';
import { SkipThrottle } from '@nestjs/throttler';

import { ParcelService } from './parcel.service';
import { PickupDto } from './dto/pickup.dto';
import { DepositDto } from './dto/deposit.dto';
import { GenerateTrackingDto } from './dto/generate-tracking.dto';
import { MissionsQueryDto, MissionTypeFilter } from './dto/missions-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { BASE_EARNINGS_PER_PARCEL } from './parcel.constants';
import { MissionsResponseDto } from './Swagger/mission-response.dto';
import type { AuthenticatedUser } from '../auth/auth.types';
import type {
  DepositResult,
  PickupResult,
  ConfirmDepositResult,
  TrackingPublicInfo,
  ParcelDetailInfo,
  PaginatedHistory,
} from './parcel.types';

@ApiTags('Parcels')
@Controller('parcels')
export class ParcelController {
  constructor(private readonly parcelService: ParcelService) {}

  @UseGuards(JwtAuthGuard)
  @Post('generate-tracking')
  @SkipThrottle({ auth: true })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Générer un numéro de suivi unique' })
  async generateTracking(
    @Body() dto: GenerateTrackingDto,
    @CurrentUser() _user: AuthenticatedUser,
  ) {
    const trackingNo = await this.parcelService.generateTrackingNumber(
      dto.prefix ?? 'SL',
    );
    return { trackingNo, timestamp: new Date().toISOString() };
  }

  @UseGuards(JwtAuthGuard)
  @Post('deposit')
  @SkipThrottle({ auth: true })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Déposer un colis dans une case' })
  async deposit(
    @Body() dto: DepositDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DepositResult> {
    return this.parcelService.deposit(dto, user.id);
  }

  // ⭐ ROUTE PUBLIQUE POUR LE RETRAIT (sans authentification)
  @Public()
  @Post('pickup')
  @SkipThrottle({ auth: true })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Retirer un colis (public - sans authentification)',
    description:
      'Permet à un client de récupérer son colis via QR code ou code à 6 chiffres.\n' +
      "Accessible depuis l'interface de l'armoire SmartLocker.",
  })
  @ApiBody({ type: PickupDto })
  @ApiResponse({
    status: 200,
    description: 'Casier ouvert, colis récupéré',
    schema: {
      example: {
        shelfNo: 'H03',
        message: 'Case ouverte ! Récupérez votre colis.',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Code invalide ou expiré' })
  @ApiResponse({
    status: 404,
    description: 'Code non trouvé ou colis déjà récupéré',
  })
  async pickup(@Body() dto: PickupDto): Promise<PickupResult> {
    return this.parcelService.pickup(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('missions')
  @SkipThrottle({ auth: true })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Feed de missions du livreur' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: MissionTypeFilter,
    description: 'Filtrer par type : all (défaut), locker, home',
  })
  async getMissions(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query?: MissionsQueryDto,
  ) {
    return this.parcelService.getMissions(user.id, {
      type: query?.type ?? MissionTypeFilter.ALL,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Post('missions/:trackingNo/claim')
  @SkipThrottle({ auth: true })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Accepter une mission disponible' })
  async claimMission(
    @Param('trackingNo') trackingNo: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.parcelService.claimMission(trackingNo, user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':trackingNo/confirm')
  @SkipThrottle({ auth: true })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Confirmer le dépôt par le livreur' })
  async confirmDeposit(
    @Param('trackingNo') trackingNo: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ConfirmDepositResult> {
    return this.parcelService.confirmDeposit(trackingNo, user.id);
  }

  @Public()
  @Get('track/:query')
  @ApiOperation({ summary: 'Suivre un colis (trackingNo ou code 6 chiffres)' })
  async track(@Param('query') query: string): Promise<TrackingPublicInfo> {
    return this.parcelService.track(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  @SkipThrottle({ auth: true })
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Historique paginé' })
  async getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<PaginatedHistory> {
    const userId = user.role === 'courier' ? user.id : undefined;
    return this.parcelService.getHistory({
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
      userId,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get(':trackingNo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Détail complet (authentifié)' })
  async getDetail(
    @Param('trackingNo') trackingNo: string,
    @CurrentUser() _user: AuthenticatedUser,
  ): Promise<ParcelDetailInfo> {
    return this.parcelService.getDetail(trackingNo);
  }

  @Public()
  @Get(':trackingNo/qrcode')
  @ApiOperation({ summary: 'Page HTML avec QR code imprimable' })
  async getParcelQRCode(
    @Param('trackingNo') trackingNo: string,
    @Res() res: Response,
  ): Promise<void> {
    const html = await this.parcelService.generateQRCodePage(trackingNo);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }
}
