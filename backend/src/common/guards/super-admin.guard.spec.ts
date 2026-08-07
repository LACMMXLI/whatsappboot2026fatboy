import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { SuperAdminGuard } from './super-admin.guard';

function buildContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

describe('SuperAdminGuard', () => {
  const guard = new SuperAdminGuard();

  it('permite pasar si isSuperAdmin es true', () => {
    expect(guard.canActivate(buildContext({ isSuperAdmin: true }))).toBe(true);
  });

  it('rechaza si isSuperAdmin es false', () => {
    expect(() => guard.canActivate(buildContext({ isSuperAdmin: false }))).toThrow(
      ForbiddenException,
    );
  });

  it('rechaza si no hay usuario en el request', () => {
    expect(() => guard.canActivate(buildContext(undefined))).toThrow(ForbiddenException);
  });
});
