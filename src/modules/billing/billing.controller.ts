// =============================================================================
// src/modules/billing/billing.controller.ts
// CONTROLLER BILLING — Correction du typage de paiement
// =============================================================================

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { PaymentDto } from './dto/payment.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Billing')
@Controller('billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ===========================================================================
  // POST /billing/invoices
  // ===========================================================================

  @Post('invoices')
  @ApiOperation({ summary: 'Créer une facture' })
  @ApiResponse({ status: 201, description: 'Facture créée' })
  @ApiResponse({ status: 400, description: 'Données invalides' })
  async create(@Body() dto: CreateInvoiceDto) {
    return this.billingService.create(dto);
  }

  // ===========================================================================
  // GET /billing/invoices
  // ===========================================================================

  @Get('invoices')
  @ApiOperation({ summary: 'Liste des factures (filtrable)' })
  @ApiResponse({ status: 200, description: 'Liste paginée' })
  async findAll(@Query() filters: InvoiceFilterDto) {
    return this.billingService.findAll(filters);
  }

  // ===========================================================================
  // GET /billing/invoices/mine
  // ===========================================================================

  @Get('invoices/mine')
  @ApiOperation({ summary: 'Mes factures (utilisateur connecté)' })
  @ApiResponse({ status: 200, description: 'Liste des factures' })
  async findMine(
    @CurrentUser('id') userId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.billingService.findByUser(userId, page ?? 1, limit ?? 10);
  }

  // ===========================================================================
  // GET /billing/invoices/:id
  // ===========================================================================

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Détail d\'une facture' })
  @ApiParam({ name: 'id', description: 'ID MongoDB de la facture' })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async findById(@Param('id') id: string) {
    return this.billingService.findById(id);
  }

  // ===========================================================================
  // GET /billing/invoices/number/:number
  // ===========================================================================

  @Get('invoices/number/:number')
  @ApiOperation({ summary: 'Détail par numéro de facture' })
  @ApiParam({
    name: 'number',
    description: 'Numéro de facture (FACT-YYYY-MM-XXXX)',
    example: 'FACT-2025-04-0001',
  })
  @ApiResponse({ status: 200, description: 'Facture trouvée' })
  async findByNumber(@Param('number') number: string) {
    return this.billingService.findByNumber(number);
  }

  // ===========================================================================
  // PATCH /billing/invoices/:id
  // ===========================================================================

  @Patch('invoices/:id')
  @ApiOperation({ summary: 'Mettre à jour une facture' })
  @ApiParam({ name: 'id', description: 'ID MongoDB de la facture' })
  @ApiResponse({ status: 200, description: 'Facture mise à jour' })
  @ApiResponse({ status: 400, description: 'Transition invalide' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateInvoiceDto,
  ) {
    return this.billingService.update(id, dto);
  }

  // ===========================================================================
  // POST /billing/invoices/:id/pay
  // ===========================================================================

  @Post('invoices/:id/pay')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Enregistrer un paiement' })
  @ApiParam({ name: 'id', description: 'ID MongoDB de la facture' })
  @ApiResponse({ status: 200, description: 'Paiement enregistré' })
  @ApiResponse({ status: 400, description: 'Montant incorrect ou statut invalide' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async processPayment(
    @Param('id') id: string,
    @Body() dto: PaymentDto,
  ) {
    // ✅ CORRECTION : Utiliser dto.paymentMethod (cohérent avec PaymentInput)
    return this.billingService.processPayment({
      invoiceId: id,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      transactionRef: dto.transactionRef,
    });
  }

  // ===========================================================================
  // DELETE /billing/invoices/:id
  // ===========================================================================

  @Delete('invoices/:id')
  @ApiOperation({ summary: 'Supprimer une facture (brouillon uniquement)' })
  @ApiParam({ name: 'id', description: 'ID MongoDB de la facture' })
  @ApiResponse({ status: 200, description: 'Facture supprimée' })
  @ApiResponse({ status: 400, description: 'Seules les factures en brouillon peuvent être supprimées' })
  @ApiResponse({ status: 404, description: 'Facture non trouvée' })
  async delete(@Param('id') id: string) {
    return this.billingService.delete(id);
  }

  // ===========================================================================
  // GET /billing/stats
  // ===========================================================================

  @Get('stats')
  @ApiOperation({ summary: 'Statistiques de facturation' })
  @ApiResponse({ status: 200, description: 'Statistiques' })
  async getStats(@CurrentUser('id') userId: string) {
    return this.billingService.getStats(userId);
  }
}