// =============================================================================
// src/common/decorators/current-user.decorator.ts
// DECORATOR — Récupère l'utilisateur courant depuis la requête
// =============================================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Décorateur pour récupérer l'utilisateur authentifié.
 * 
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser() user: User) {
 *   return user;
 * }
 * 
 * @example
 * @Get('profile')
 * getProfile(@CurrentUser('id') userId: string) {
 *   return this.userService.findById(userId);
 * }
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    
    // Si une propriété spécifique est demandée, la retourner
    if (data) {
      return user?.[data];
    }
    
    // Sinon retourner l'utilisateur complet
    return user;
  },
);