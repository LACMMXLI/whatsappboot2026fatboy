import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  forwardRef,
  UseGuards,
} from '@nestjs/common';
import { MessageSenderType } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BusinessId } from '../../common/decorators/business-id.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { ConversationsService } from './conversations.service';
import { AssignConversationDto } from './dto/assign-conversation.dto';
import { ReleaseControlDto } from './dto/release-control.dto';
import { UsersService } from '../users/users.service';
import { MessagesService } from '../messages/messages.service';

@ApiTags('conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => MessagesService))
    private readonly messagesService: MessagesService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar conversaciones (chats) del negocio' })
  findAll(@BusinessId() businessId: string) {
    return this.conversationsService.findAll(businessId);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Ver el historial de una conversacion (incluye mensajes). Marca la conversacion como leida.',
  })
  findOne(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.conversationsService.findOne(businessId, id);
  }

  @Patch(':id/toggle-bot')
  @ApiOperation({
    summary: 'Activar/desactivar el bot para una conversacion especifica',
  })
  toggleBot(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.conversationsService.toggleBot(businessId, id);
  }

  @Patch(':id/assign')
  @ApiOperation({ summary: 'Asignar una conversacion a un usuario/agente' })
  assign(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @Body() dto: AssignConversationDto,
  ) {
    return this.conversationsService.assign(businessId, id, dto.userId);
  }

  @Patch(':id/release-control')
  @ApiOperation({
    summary:
      'Liberar el control humano de una conversacion (desasignar y, opcionalmente, reactivar el bot). No la marca como resuelta.',
  })
  async releaseControl(
    @BusinessId() businessId: string,
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReleaseControlDto,
  ) {
    // El scoping por businessId en el service ya impide liberar una
    // conversacion de otro negocio (404 si no coincide).
    const actingUser = await this.usersService.findById(user.userId);
    if (!actingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    const updated = await this.conversationsService.releaseControl(
      businessId,
      id,
      dto.reactivateBot,
    );
    await this.messagesService.sendOutbound({
      businessId,
      conversationId: id,
      content: `${actingUser.name} liberó la conversación`,
      senderType: MessageSenderType.SYSTEM,
    });
    return updated;
  }

  @Patch(':id/resolve')
  @ApiOperation({ summary: 'Marcar la conversacion como resuelta' })
  resolve(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.conversationsService.resolve(businessId, id);
  }

  @Patch(':id/reopen')
  @ApiOperation({ summary: 'Reabrir una conversacion previamente resuelta' })
  reopen(@BusinessId() businessId: string, @Param('id') id: string) {
    return this.conversationsService.reopen(businessId, id);
  }
}
