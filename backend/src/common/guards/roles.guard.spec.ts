import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

function buildContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildGuard(requiredRoles: string[] | undefined) {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(requiredRoles) };
  return new RolesGuard(reflector as unknown as Reflector);
}

describe('RolesGuard', () => {
  it('sin @Roles() en el endpoint, deja pasar a cualquiera', () => {
    const guard = buildGuard(undefined);
    expect(guard.canActivate(buildContext({ role: 'AGENT' }))).toBe(true);
  });

  it('con @Roles("ADMIN"), un AGENT es rechazado', () => {
    const guard = buildGuard(['ADMIN']);
    expect(() => guard.canActivate(buildContext({ role: 'AGENT' }))).toThrow(
      ForbiddenException,
    );
  });

  it('con @Roles("ADMIN"), un ADMIN pasa', () => {
    const guard = buildGuard(['ADMIN']);
    expect(guard.canActivate(buildContext({ role: 'ADMIN' }))).toBe(true);
  });
});
