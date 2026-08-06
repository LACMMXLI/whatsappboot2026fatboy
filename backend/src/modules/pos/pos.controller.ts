import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { PosService } from './pos.service';
import { PosStatusDto } from './dto/pos-status.dto';

@ApiTags('pos')
@Controller('pos')
export class PosController {
  constructor(
    private readonly posService: PosService,
    private readonly configService: ConfigService,
  ) {}

  @Post('orders/:id/send')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Enviar un pedido confirmado al POS' })
  sendOrder(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.posService.sendOrder(businessId, id);
  }

  @Post('webhook/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Webhook publico del POS: recibe cambios de estado (ready, delivered) y notifica al cliente',
  })
  async statusWebhook(
    @Body() dto: PosStatusDto,
    @Headers('x-webhook-secret') providedSecret?: string,
  ) {
    const expectedSecret = this.configService.get<string>('pos.webhookSecret');
    if (expectedSecret && providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Webhook secret invalido');
    }
    return this.posService.receiveStatusUpdate(dto.orderId, dto.status);
  }
}
