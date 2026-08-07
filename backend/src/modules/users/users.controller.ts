import { Body, Controller, Get, NotFoundException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener el usuario autenticado' })
  async me(@CurrentUser() user: AuthenticatedUser) {
    const found = await this.usersService.findById(user.userId);
    if (!found) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const { passwordHash: _passwordHash, ...safeUser } = found;
    return safeUser;
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({ summary: 'Listar el equipo (usuarios) del negocio' })
  async findAll(@BusinessId() businessId: string) {
    const users = await this.usersService.findAllByBusiness(businessId);
    return users.map(({ passwordHash: _passwordHash, ...safeUser }) => safeUser);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  @ApiOperation({
    summary: 'Agregar un empleado (usuario) al propio negocio',
  })
  async create(@BusinessId() businessId: string, @Body() dto: CreateUserDto) {
    const user = await this.usersService.createWithPassword(businessId, dto);
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}
