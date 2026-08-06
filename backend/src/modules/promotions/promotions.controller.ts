import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { PromotionsService } from './promotions.service';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@ApiTags('promotions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('promotions')
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todas las promociones del negocio' })
  findAll(@BusinessId() businessId: string) {
    return this.promotionsService.findAll(businessId);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Listar promociones activas (usadas por el bot para sugerir)',
  })
  findActive(@BusinessId() businessId: string) {
    return this.promotionsService.findActive(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una promocion por id' })
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.promotionsService.findOne(businessId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear una promocion' })
  create(@BusinessId() businessId: string, @Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(businessId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar una promocion' })
  update(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(businessId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar una promocion' })
  remove(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.promotionsService.remove(businessId, id);
  }
}
