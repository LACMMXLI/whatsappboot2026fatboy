import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
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
import { BotConfigModule } from './modules/bot-config/bot-config.module';
import { SuperAdminModule } from './modules/superadmin/superadmin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    // Rate limit por IP para TODA la API (defensa base). Endpoints publicos
    // sensibles (login, webhooks) definen limites mas estrictos con
    // @Throttle a nivel de ruta. Ver src/config/configuration.ts.
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: () => ({
        throttlers: [{ ttl: 60_000, limit: 100 }],
      }),
    }),
    PrismaModule,
    BullmqModule,
    HealthModule,
    BotConfigModule,
    SuperAdminModule,
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
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
