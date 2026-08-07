import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Restringe un endpoint a uno o mas roles DENTRO del negocio del usuario
 * (ADMIN/AGENT). No tiene relacion con isSuperAdmin (ver SuperAdminGuard).
 * Uso: @Roles('ADMIN') junto con @UseGuards(JwtAuthGuard, RolesGuard).
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
