import { Module, forwardRef } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { RealtimeModule } from '../realtime/realtime.module';
import { UsersModule } from '../users/users.module';
import { MessagesModule } from '../messages/messages.module';

@Module({
  // MessagesModule <-> ConversationsModule es un ciclo real (el controller
  // de conversaciones registra un mensaje SYSTEM al liberar el control; el
  // servicio de mensajes actualiza la conversacion al recibir un mensaje).
  // forwardRef() en ambos modulos resuelve el ciclo en tiempo de arranque.
  imports: [RealtimeModule, UsersModule, forwardRef(() => MessagesModule)],
  providers: [ConversationsService],
  controllers: [ConversationsController],
  exports: [ConversationsService],
})
export class ConversationsModule {}
