import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { SuperAdminGuard } from '../../common/guards/super-admin.guard';
import { SuperAdminService } from './superadmin.service';
import { CreateBusinessDto } from './dto/create-business.dto';

@ApiTags('superadmin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SuperAdminGuard)
@Controller('superadmin/businesses')
export class SuperAdminController {
  constructor(private readonly superAdminService: SuperAdminService) {}

  @Get()
  @ApiOperation({ summary: '[Superadmin] Listar todos los negocios (tenants) de la plataforma' })
  findAll() {
    return this.superAdminService.listBusinesses();
  }

  @Get(':id')
  @ApiOperation({ summary: '[Superadmin] Detalle de un negocio, con su equipo' })
  findOne(@Param('id') id: string) {
    return this.superAdminService.getBusiness(id);
  }

  @Post()
  @ApiOperation({
    summary:
      '[Superadmin] Dar de alta un negocio nuevo + su primer usuario ADMIN, e intentar conectar su WhatsApp',
  })
  create(@Body() dto: CreateBusinessDto) {
    return this.superAdminService.createBusiness(dto);
  }

  @Post(':id/whatsapp/provision')
  @ApiOperation({
    summary:
      '[Superadmin] (Re)crear la instancia de WhatsApp del negocio y devolver el QR. Reintenta si quedo en ERROR.',
  })
  provisionWhatsapp(@Param('id') id: string) {
    return this.superAdminService.provisionWhatsapp(id);
  }

  @Post(':id/whatsapp/qr')
  @ApiOperation({ summary: '[Superadmin] Pedir un QR nuevo (reconectar / QR vencido)' })
  regenerateQrCode(@Param('id') id: string) {
    return this.superAdminService.regenerateQrCode(id);
  }

  @Get(':id/whatsapp/status')
  @ApiOperation({ summary: '[Superadmin] Consultar el estado de conexion en vivo (para polling)' })
  refreshConnectionStatus(@Param('id') id: string) {
    return this.superAdminService.refreshConnectionStatus(id);
  }

  @Post(':id/whatsapp/disconnect')
  @ApiOperation({ summary: '[Superadmin] Desconectar el WhatsApp (logout, la instancia sigue existiendo)' })
  disconnect(@Param('id') id: string) {
    return this.superAdminService.disconnectWhatsapp(id);
  }

  @Post(':id/whatsapp/restart')
  @ApiOperation({ summary: '[Superadmin] Reiniciar la instancia' })
  restart(@Param('id') id: string) {
    return this.superAdminService.restartWhatsapp(id);
  }

  @Post(':id/whatsapp/delete')
  @ApiOperation({
    summary: '[Superadmin] Eliminar la instancia por completo (para poder recrearla desde cero)',
  })
  deleteInstance(@Param('id') id: string) {
    return this.superAdminService.deleteWhatsappInstance(id);
  }
}
