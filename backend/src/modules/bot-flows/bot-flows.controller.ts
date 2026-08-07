import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { BotFlowsService } from './bot-flows.service';
import { CreateFlowDto } from './dto/create-flow.dto';
import { ToggleFlowActiveDto } from './dto/toggle-flow-active.dto';

@ApiTags('bot-flows')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bot-flows')
export class BotFlowsController {
  constructor(private readonly flowsService: BotFlowsService) {}

  @Get()
  @ApiOperation({
    summary:
      'Listar los flujos personalizados del negocio (ej. horarios, ubicacion, FAQs propias)',
  })
  findAll(@BusinessId() businessId: string) {
    return this.flowsService.findAll(businessId);
  }

  @Post()
  @ApiOperation({ summary: 'Crear un flujo personalizado (nombre, disparadores y pasos)' })
  create(@BusinessId() businessId: string, @Body() dto: CreateFlowDto) {
    return this.flowsService.create(businessId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Reemplazar un flujo existente (nombre, disparadores y pasos)' })
  update(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: CreateFlowDto,
  ) {
    return this.flowsService.update(businessId, id, dto);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Activar o pausar un flujo sin editar su contenido' })
  toggleActive(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: ToggleFlowActiveDto,
  ) {
    return this.flowsService.toggleActive(businessId, id, dto.active);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar un flujo personalizado' })
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.flowsService.remove(businessId, id);
  }
}
