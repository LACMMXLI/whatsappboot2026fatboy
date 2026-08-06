import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { WhatsappController } from './whatsapp.controller';
import { WhatsappWebhookService } from './whatsapp.webhook.service';
import { EvolutionApiModule } from './evolution-api.module';
import { BusinessesModule } from '../businesses/businesses.module';
import { CustomersModule } from '../customers/customers.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { BOT_QUEUE } from '../../queue/queue.constants';

@Module({
  imports: [
    BullModule.registerQueue({ name: BOT_QUEUE }),
    EvolutionApiModule,
    BusinessesModule,
    CustomersModule,
    ConversationsModule,
    MessagesModule,
  ],
  controllers: [WhatsappController],
  providers: [WhatsappWebhookService],
  exports: [EvolutionApiModule],
})
export class WhatsappModule {}
