import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { BusinessesService } from './businesses.service';
import { UpdateWhatsappInstanceDto } from './dto/update-whatsapp-instance.dto';
import { UpdateBusinessSettingsDto } from './dto/update-business-settings.dto';

@ApiTags('businesses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly businessesService: BusinessesService) {}

  @Get('me')
  @ApiOperation({ summary: 'Obtener el negocio del usuario autenticado' })
  me(@BusinessId() businessId: string) {
    return this.businessesService.findById(businessId);
  }

  @Patch('me/whatsapp-instance')
  @ApiOperation({
    summary:
      'Configurar el nombre de instancia de Evolution API asociado a este negocio (soporte multi-instancia)',
  })
  updateWhatsappInstance(
    @BusinessId() businessId: string,
    @Body() dto: UpdateWhatsappInstanceDto,
  ) {
    return this.businessesService.updateWhatsappInstance(
      businessId,
      dto.whatsappInstanceId,
    );
  }

  @Patch('me/settings')
  @ApiOperation({
    summary:
      'Configurar ajustes del negocio (ej. minutos de umbral para el estado "esperando")',
  })
  updateSettings(
    @BusinessId() businessId: string,
    @Body() dto: UpdateBusinessSettingsDto,
  ) {
    return this.businessesService.updateSettings(businessId, dto);
  }
}
