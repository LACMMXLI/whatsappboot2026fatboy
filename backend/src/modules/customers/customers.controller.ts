import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { CustomersService } from './customers.service';

@ApiTags('customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar clientes del negocio' })
  findAll(@BusinessId() businessId: string) {
    return this.customersService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un cliente por id' })
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.customersService.findOne(businessId, id);
  }
}
