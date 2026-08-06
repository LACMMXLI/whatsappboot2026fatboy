import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { BullmqModule } from './queue/bullmq.module';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { BusinessesModule } from './modules/businesses/businesses.module';
import { CustomersModule } from './modules/customers/customers.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ProductsModule } from './modules/products/products.module';
import { PromotionsModule } from './modules/promotions/promotions.module';
import { OrdersModule } from './modules/orders/orders.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { BotModule } from './modules/bot/bot.module';
import { PosModule } from './modules/pos/pos.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PrismaModule,
    BullmqModule,
    HealthModule,
    AuthModule,
    UsersModule,
    BusinessesModule,
    CustomersModule,
    ConversationsModule,
    MessagesModule,
    ProductsModule,
    PromotionsModule,
    OrdersModule,
    WhatsappModule,
    BotModule,
    PosModule,
    RealtimeModule,
  ],
})
export class AppModule {}
