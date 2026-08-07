import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  businessId: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') as string,
    });
  }

  validate(payload: JwtPayload): AuthenticatedUser {
    return {
      userId: payload.sub,
      businessId: payload.businessId,
      email: payload.email,
      role: payload.role,
      isSuperAdmin: payload.isSuperAdmin ?? false,
    };
  }
}
