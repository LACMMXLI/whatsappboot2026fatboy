import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Extrae el businessId del usuario autenticado (multi-tenant scoping).
 * Uso: @BusinessId() businessId: string
 */
export const BusinessId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.businessId;
  },
);
