import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MessageSenderType } from '@prisma/client';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import {
  BusinessId,
} from '../../common/decorators/business-id.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../common/decorators/current-user.decorator';
import { MessagesService } from './messages.service';
import { SendMessageDto } from './dto/send-message.dto';
import { UsersService } from '../users/users.service';

@ApiTags('messages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly usersService: UsersService,
  ) {}

  @Get(':conversationId')
  @ApiOperation({ summary: 'Ver el historial de mensajes de una conversacion' })
  findByConversation(
    @BusinessId() businessId: string,
    @Param('conversationId') conversationId: string,
  ) {
    return this.messagesService.findByConversation(businessId, conversationId);
  }

  @Post('send')
  @ApiOperation({
    summary: 'Enviar un mensaje manual (agente humano) a una conversacion',
  })
  async send(
    @BusinessId() businessId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    // senderType/senderUserId SIEMPRE se fuerzan desde el JWT: el body del
    // request no puede suplantar al bot, a otro usuario ni a una integracion.
    const currentUser = await this.usersService.findById(user.userId);
    if (!currentUser) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return this.messagesService.sendOutbound({
      businessId,
      conversationId: dto.conversationId,
      content: dto.content,
      senderType: MessageSenderType.AGENT,
      senderUserId: currentUser.id,
      senderNameSnapshot: currentUser.name,
    });
  }
}
