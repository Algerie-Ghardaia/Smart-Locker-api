// =============================================================================
// src/app.controller.ts
// CONTROLLER RACINE — Health check et documentation
// =============================================================================
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';
import { AppService } from './app.service';

@ApiTags('Root')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  /**
   * GET /
   * Health check public.
   * Retourne un simple message de confirmation.
   */
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Health Check',
    description: "Vérifie si l'API est opérationnelle.",
  })
  @ApiResponse({
    status: 200,
    description: "L'API fonctionne correctement.",
    schema: {
      example: 'Hello World!',
    },
  })
  getHello(): string {
    return this.appService.getHello();
  }

  /**
   * GET /info
   * Informations détaillées sur l'API (Version, Status, etc.).
   */
  @Public()
  @Get('info')
  @ApiOperation({
    summary: 'Informations API',
    description: "Récupère les métadonnées de l'application.",
  })
  @ApiResponse({
    status: 200,
    description: "Objet contenant les détails de l'API.",
  })
  getInfo() {
    return this.appService.getInfo();
  }
}
