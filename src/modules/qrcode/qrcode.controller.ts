// =============================================================================
// src/modules/qrcode/qrcode.controller.ts
// CONTROLLER — API de génération de QR codes
// =============================================================================

import { Controller, Post, Get, Body, Param, Query, Res, StreamableFile } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { QRCodeService } from './qrcode.service';
import { GenerateQRDto, QRCodeFormat, QRCodeTemplate } from './dto/generate-qr.dto'; // Ajout de QRCodeTemplate
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('qrcode')
@Controller('qrcode')
export class QRCodeController {
  constructor(private readonly qrCodeService: QRCodeService) {}

  /**
   * API principale : Génère un QR code (POST)
   */
  @Public()
  @Post('generate')
  @ApiOperation({ 
    summary: 'Générer un QR code', 
    description: 'Génère un QR code dans différents formats (PNG, SVG, Base64, Data URL)' 
  })
  @ApiBody({ type: GenerateQRDto })
  @ApiResponse({ status: 201, description: 'QR code généré avec succès' })
  @ApiResponse({ status: 400, description: 'Paramètres invalides' })
  async generate(@Body() dto: GenerateQRDto) {
    const result = await this.qrCodeService.generate(dto);
    
    if (dto.format === QRCodeFormat.PNG) {
      return { success: true, data: { format: 'png', size: (result as Buffer).length } };
    }
    
    return { success: true, data: result };
  }

  /**
   * Téléchargement direct du QR code en PNG
   */
  @Public()
  @Get('download')
  @ApiOperation({ summary: 'Télécharger un QR code en PNG' })
  @ApiQuery({ name: 'content', description: 'Contenu du QR code', example: '123456' })
  @ApiQuery({ name: 'width', required: false, description: 'Largeur', example: 400 })
  @ApiQuery({ name: 'filename', required: false, description: 'Nom du fichier', example: 'qrcode' })
  async download(
    @Query('content') content: string,
    @Query('width') width?: string,
    @Query('filename') filename?: string,
    @Res({ passthrough: true }) res?: Response,
  ) {
    const dto: GenerateQRDto = {
      content,
      format: QRCodeFormat.PNG,
      width: width ? parseInt(width) : 400,
    };
    
    const buffer = await this.qrCodeService.generate(dto) as Buffer;
    
    res?.set({
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="${filename || 'qrcode'}.png"`,
    });
    
    return new StreamableFile(buffer);
  }

  /**
   * Affiche une page HTML avec le QR code
   */
  @Public()
  @Get('view')
  @ApiOperation({ summary: 'Afficher une page HTML avec le QR code' })
  @ApiQuery({ name: 'content', description: 'Contenu du QR code', example: '123456' })
  @ApiQuery({ name: 'template', required: false, description: 'Template (simple, pickup)', example: 'pickup' })
  @ApiQuery({ name: 'recipientName', required: false, description: 'Nom du destinataire' })
  @ApiQuery({ name: 'shelfNo', required: false, description: 'Numéro de casier' })
  @ApiQuery({ name: 'expiresAt', required: false, description: 'Date d\'expiration' })
  async view(
    @Query('content') content: string,
    @Query('template') template?: string,
    @Query('recipientName') recipientName?: string,
    @Query('shelfNo') shelfNo?: string,
    @Query('expiresAt') expiresAt?: string,
    @Res() res?: Response,
  ) {
    // Conversion du template string vers l'enum
    let templateEnum: QRCodeTemplate = QRCodeTemplate.SIMPLE;
    if (template === 'pickup') templateEnum = QRCodeTemplate.PICKUP;
    if (template === 'email') templateEnum = QRCodeTemplate.EMAIL;
    if (template === 'sms') templateEnum = QRCodeTemplate.SMS;

    const dto: GenerateQRDto = {
      content,
      template: templateEnum,
      recipientName,
      shelfNo,
      expiresAt,
    };
    
    const qrCodeDataUrl = await this.qrCodeService.generate({
      ...dto,
      format: QRCodeFormat.DATA_URL,
    }) as string;
    
    const html = await this.qrCodeService.generateHTMLPage(dto, qrCodeDataUrl);
    
    res?.set('Content-Type', 'text/html');
    res?.send(html);
  }

  /**
   * Génère un QR code pour un code de retrait existant (alias)
   */
  @Public()
  @Get(':code')
  @ApiOperation({ summary: 'Afficher le QR code pour un code de retrait' })
  @ApiParam({ name: 'code', description: 'Code de retrait', example: '123456' })
  async getByCode(@Param('code') code: string, @Res() res: Response) {
    const dto: GenerateQRDto = {
      content: code,
      template: QRCodeTemplate.PICKUP, // Correction : utilisation de l'enum
      format: QRCodeFormat.DATA_URL,
    };
    
    const qrCodeDataUrl = await this.qrCodeService.generate(dto) as string;
    const html = await this.qrCodeService.generateHTMLPage(dto, qrCodeDataUrl);
    
    res.set('Content-Type', 'text/html');
    res.send(html);
  }
}