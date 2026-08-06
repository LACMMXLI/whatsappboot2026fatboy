import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BOT_QUEUE } from '../../queue/queue.constants';
import { IntentDetectorService } from './intent-detector.service';
import { ConversationStateMachine } from './conversation-state-machine';
import { ResponseGeneratorService } from './response-generator.service';
import { BotEngineService } from './bot-engine.service';
import { BotProcessor } from './bot.processor';
import { ProductsModule } from '../products/products.module';
import { PromotionsModule } from '../promotions/promotions.module';
import { OrdersModule } from '../orders/orders.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { MessagesModule } from '../messages/messages.module';
import { BotConfigModule } from '../bot-config/bot-config.module';
import { CustomersModule } from '../customers/customers.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: BOT_QUEUE }),
    ProductsModule,
    PromotionsModule,
    OrdersModule,
    ConversationsModule,
    MessagesModule,
    BotConfigModule,
    CustomersModule,
  ],
  providers: [
    IntentDetectorService,
    ConversationStateMachine,
    ResponseGeneratorService,
    BotEngineService,
    BotProcessor,
  ],
})
export class BotModule {}
