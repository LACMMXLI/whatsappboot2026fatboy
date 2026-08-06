import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { BotTemplateKey } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import { BotResponseTemplatesService } from './bot-response-templates.service';
import { BotKeywordRulesService } from './bot-keyword-rules.service';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { CreateKeywordDto } from './dto/create-keyword.dto';

@ApiTags('bot-config')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bot-config')
export class BotConfigController {
  constructor(
    private readonly templatesService: BotResponseTemplatesService,
    private readonly keywordsService: BotKeywordRulesService,
  ) {}

  @Get('templates')
  @ApiOperation({
    summary:
      'Listar los mensajes cortos personalizables del bot (saludo, cancelacion, derivar a humano, no entendi)',
  })
  findTemplates(@BusinessId() businessId: string) {
    return this.templatesService.findAll(businessId);
  }

  @Put('templates/:key')
  @ApiOperation({ summary: 'Personalizar el texto de un mensaje del bot' })
  updateTemplate(
    @BusinessId() businessId: string,
    @Param('key', new ParseEnumPipe(BotTemplateKey)) key: BotTemplateKey,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.templatesService.update(businessId, key, dto.content);
  }

  @Delete('templates/:key')
  @ApiOperation({ summary: 'Restaurar el texto por defecto de un mensaje del bot' })
  resetTemplate(
    @BusinessId() businessId: string,
    @Param('key', new ParseEnumPipe(BotTemplateKey)) key: BotTemplateKey,
  ) {
    return this.templatesService.reset(businessId, key);
  }

  @Get('keywords')
  @ApiOperation({ summary: 'Listar palabras/frases clave personalizadas por intencion' })
  findKeywords(@BusinessId() businessId: string) {
    return this.keywordsService.findAll(businessId);
  }

  @Post('keywords')
  @ApiOperation({
    summary:
      'Agregar una palabra/frase clave propia para una intencion (ej. sinonimo de "menu")',
  })
  createKeyword(@BusinessId() businessId: string, @Body() dto: CreateKeywordDto) {
    return this.keywordsService.create(businessId, dto.intent, dto.phrase);
  }

  @Delete('keywords/:id')
  @ApiOperation({ summary: 'Eliminar una palabra/frase clave personalizada' })
  removeKeyword(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.keywordsService.remove(businessId, id);
  }
}
