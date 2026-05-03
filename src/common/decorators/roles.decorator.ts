// =============================================================================
// src/common/decorators/roles.decorator.ts
// DECORATOR — Restreint l'accès à certains rôles
// =============================================================================

import { SetMetadata } from '@nestjs/common';
import { Role } from '../types/role.enum';

export const ROLES_KEY = 'roles';

/**
 * Décorateur pour restreindre l'accès à une route selon les rôles.
 * 
 * @example
 * @Roles(Role.ADMIN)
 * @Get('admin/users')
 * getUsers() { ... }
 * 
 * @example
 * @Roles(Role.ADMIN, Role.OPERATOR)
 * @Get('lockers')
 * getLockers() { ... }
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

