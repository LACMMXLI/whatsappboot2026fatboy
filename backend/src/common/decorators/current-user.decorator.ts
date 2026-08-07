import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthenticatedUser {
  userId: string;
  businessId: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

/**
 * Extrae el usuario autenticado (adjuntado por JwtStrategy) del request.
 * Uso: @CurrentUser() user: AuthenticatedUser
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthenticatedUser = request.user;
    return data ? user?.[data] : user;
  },
);
