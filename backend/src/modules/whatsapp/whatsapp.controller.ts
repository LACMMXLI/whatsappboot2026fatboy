import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Logger,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { WhatsappWebhookService } from './whatsapp.webhook.service';

@ApiTags('whatsapp')
@Controller('webhook')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(
    private readonly webhookService: WhatsappWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Post('whatsapp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Webhook publico de Evolution API. Recibe eventos de WhatsApp (mensajes entrantes).',
  })
  async receive(
    @Body() body: Record<string, unknown>,
    @Headers('x-webhook-secret') providedSecret?: string,
  ) {
    const expectedSecret = this.configService.get<string>(
      'whatsapp.webhookSecret',
    );
    if (expectedSecret && providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Webhook secret invalido');
    }
    if (!expectedSecret) {
      this.logger.warn(
        'WHATSAPP_WEBHOOK_SECRET no configurado: el webhook no esta validando el origen de las peticiones.',
      );
    }

    await this.webhookService.handleIncoming(body as never);
    return { received: true };
  }
}
