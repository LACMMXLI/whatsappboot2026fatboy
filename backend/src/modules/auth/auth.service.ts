import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales invalidas');
    }
    return this.buildAuthResponse(user, user.businessId);
  }

  private buildAuthResponse(
    user: { id: string; email: string; role: string; name: string; isSuperAdmin: boolean },
    businessId: string,
  ) {
    const payload = {
      sub: user.id,
      businessId,
      email: user.email,
      role: user.role,
      isSuperAdmin: user.isSuperAdmin,
    };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        businessId,
        isSuperAdmin: user.isSuperAdmin,
      },
    };
  }
}
