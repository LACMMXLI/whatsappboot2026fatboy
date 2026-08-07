import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Protege todo /superadmin/*. Requiere JwtAuthGuard antes (necesita
 * request.user ya poblado). isSuperAdmin es independiente del rol
 * ADMIN/AGENT dentro de un negocio: es "dueño de la plataforma", puede ver
 * TODOS los negocios ademas del suyo propio.
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    if (!user?.isSuperAdmin) {
      throw new ForbiddenException('Solo el superadmin puede acceder a esto');
    }
    return true;
  }
}
